require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// Yahan GetItemCommand add kiya gaya hai status check ke liye
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const app = express();
app.use(cors());
app.use(express.json());

// AWS SDK Clients initialization
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const RAW_BUCKET_NAME = process.env.RAW_BUCKET_NAME || 'compressedme-raw-files';
const DYNAMO_TABLE_NAME = process.env.DYNAMO_TABLE_NAME || 'compressedme-jobs';

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Backend is running fine!' });
});

// Main Endpoint: Get Presigned URL and Create Job
app.post('/api/upload-url', async (req, res) => {
    try {
        const { filename, fileType } = req.body;

        if (!filename || !fileType) {
            return res.status(400).json({ error: 'filename and fileType are required' });
        }

        // 1. Generate Unique Job ID aur naya filename (taki collisions na ho)
        const jobId = uuidv4();
        const fileExtension = filename.split('.').pop();
        const s3Key = `${jobId}.${fileExtension}`; // S3 me file is naam se save hogi

        // 2. Generate S3 Presigned URL (Valid for 5 minutes)
        const command = new PutObjectCommand({
            Bucket: RAW_BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType
        });
        
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // 3. Create entry in DynamoDB
        const dynamoParams = {
            TableName: DYNAMO_TABLE_NAME,
            Item: {
                'job_id': { S: jobId },
                'original_filename': { S: filename },
                's3_key': { S: s3Key },
                'status': { S: 'PROCESSING' },
                'created_at': { S: new Date().toISOString() }
            }
        };

        await dynamoClient.send(new PutItemCommand(dynamoParams));

        // 4. Send response to React Frontend
        res.status(200).json({
            jobId: jobId,
            uploadUrl: presignedUrl,
            s3Key: s3Key,
            message: 'Presigned URL generated and job tracked successfully.'
        });

    } catch (error) {
        console.error("Error generating presigned URL:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint: Check Job Status (React isko bar bar call karega status check karne ke liye)
app.get('/api/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const params = {
            TableName: DYNAMO_TABLE_NAME,
            Key: {
                'job_id': { S: jobId }
            }
        };

        const { Item } = await dynamoClient.send(new GetItemCommand(params));

        if (!Item) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.status(200).json({
            status: Item.status.S,
            download_url: Item.download_url ? Item.download_url.S : null
        });
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});