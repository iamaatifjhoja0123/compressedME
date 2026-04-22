import os
import boto3
import fitz  # PyMuPDF library for PDFs fallback
from PIL import Image
from urllib.parse import unquote_plus
import subprocess # Ghostscript chalane ke liye zaroori

# AWS SDK Clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'ap-south-1'))

PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET_NAME', 'compressedme-processed-files')
TABLE_NAME = os.environ.get('DYNAMO_TABLE_NAME', 'compressedme-jobs')

def compress_image(input_path, output_path, ext):
    """Images ko Pillow se aggressive compress karna, format explicit set karke"""
    with Image.open(input_path) as img:
        # Transparency (RGBA/P) ko RGB mein convert karna (sirf JPEG/JFIF ke liye)
        if img.mode in ("RGBA", "P") and ext in ['jpg', 'jpeg', 'jfif']:
            img = img.convert("RGB")
        
        if ext in ['jpg', 'jpeg', 'jfif']:
            # jfif ko hum directly JPEG format dekar save karenge
            img.save(output_path, format='JPEG', optimize=True, quality=50)
        elif ext == 'webp':
            img.save(output_path, format='WEBP', quality=50)
        elif ext == 'png':
            # PNG quality parameter support nahi karta, isliye sirf optimize
            img.save(output_path, format='PNG', optimize=True)
        else:
            img.save(output_path)

def compress_pdf(input_path, output_path):
    """Ghostscript ka use karke aggressive PDF compression (Industry Standard)"""
    try:
        # Ghostscript command: PDF ke andar ki images ko compress karega
        command = [
            "gs", 
            "-sDEVICE=pdfwrite", 
            "-dCompatibilityLevel=1.4", 
            "-dPDFSETTINGS=/screen",
            "-dNOPAUSE", 
            "-dQUIET", 
            "-dBATCH", 
            f"-sOutputFile={output_path}", 
            input_path
        ]
        
        result = subprocess.run(command, capture_output=True, text=True)
        
        # Agar Ghostscript fail ho jaye, ya file create na ho.
        if result.returncode != 0 or not os.path.exists(output_path):
            print(f"Ghostscript failed (Return code: {result.returncode}). Falling back to PyMuPDF.")
            doc = fitz.open(input_path)
            doc.save(
                output_path, 
                garbage=4, deflate=True, clean=True, linear=True, 
                deflate_images=True, deflate_fonts=True
            )
            doc.close()
            
    except Exception as e:
        print(f"PDF Compression Error: {e}")
        # Ek aur final fallback
        doc = fitz.open(input_path)
        doc.save(output_path, garbage=4, deflate=True)
        doc.close()

def handler(event, context):
    """Main Lambda Handler jo S3 trigger par chalega"""
    job_id = None
    try:
        for record in event['Records']:
            source_bucket = record['s3']['bucket']['name']
            key = unquote_plus(record['s3']['object']['key'])
            
            job_id = key.rsplit('.', 1)[0]
            file_ext = key.rsplit('.', 1)[-1].lower()
            
            download_path = f"/tmp/{key}"
            compressed_filename = f"compressed-{key}"
            upload_path = f"/tmp/{compressed_filename}"
            
            print(f"Downloading {key} from {source_bucket}...")
            s3_client.download_file(source_bucket, key, download_path)
            
            print(f"Compressing {file_ext} file...")
            if file_ext in ['jpg', 'jpeg', 'png', 'jfif', 'webp']:
                compress_image(download_path, upload_path, file_ext)
                content_type = 'image/jpeg' if file_ext == 'jfif' else f'image/{file_ext}'
            elif file_ext == 'pdf':
                compress_pdf(download_path, upload_path)
                content_type = 'application/pdf'
            else:
                raise Exception(f"Unsupported file type: {file_ext}")
                
            # Extra Check: Agar size kam na hua ho, toh original file hi bhej do
            original_size = os.path.getsize(download_path)
            compressed_size = os.path.getsize(upload_path)
            print(f"Original Size: {original_size} bytes | Compressed Size: {compressed_size} bytes")
            
            if compressed_size >= original_size:
                print("No compression achieved (File might already be highly optimized). Uploading original.")
                upload_path = download_path 
                
            # 3. Upload to Processed S3 Bucket
            print(f"Uploading to {PROCESSED_BUCKET}...")
            s3_client.upload_file(
                upload_path, 
                PROCESSED_BUCKET, 
                compressed_filename,
                ExtraArgs={'ContentType': content_type}
            )
            
            # 4. Generate Download URL (Valid for 1 Hour) WITH FORCED DOWNLOAD
            print("Generating forced download presigned URL...")
            download_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': PROCESSED_BUCKET, 
                    'Key': compressed_filename,
                    'ResponseContentDisposition': f'attachment; filename="{compressed_filename}"'
                },
                ExpiresIn=3600
            )
            
            # 5. Update DynamoDB Job Status to COMPLETED
            print("Updating DynamoDB status to COMPLETED...")
            table = dynamodb.Table(TABLE_NAME)
            table.update_item(
                Key={'job_id': job_id},
                UpdateExpression="SET #s = :status, download_url = :url",
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={
                    ':status': 'COMPLETED',
                    ':url': download_url
                }
            )
            
            # 6. Cleanup /tmp directory (taaki Lambda memory full na ho)
            if os.path.exists(download_path): os.remove(download_path)
            if upload_path != download_path and os.path.exists(upload_path): os.remove(upload_path)
            
        return {"statusCode": 200, "body": "Compression Success"}
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        if job_id:
            try:
                table = dynamodb.Table(TABLE_NAME)
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression="SET #s = :status",
                    ExpressionAttributeNames={'#s': 'status'},
                    ExpressionAttributeValues={':status': 'ERROR'}
                )
            except Exception as db_error:
                print(f"Failed to update DynamoDB with error status: {db_error}")
                
        return {"statusCode": 500, "body": f"Error: {str(e)}"}