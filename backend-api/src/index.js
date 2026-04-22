require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const serverless = require('serverless-http');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token');
    
    // Preflight (OPTIONS) request par turant 200 OK bhejo
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const RAW_BUCKET_NAME = process.env.RAW_BUCKET_NAME || 'compressedme-raw-files';
const DYNAMO_TABLE_NAME = process.env.DYNAMO_TABLE_NAME || 'compressedme-jobs';

// 1. Root and Health Checks
app.get('/', (req, res) => res.status(200).json({ status: 'API is running' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', message: 'Lambda Backend is running fine!' }));

// 2. Upload URL Generator
app.post('/api/upload-url', async (req, res) => {
    try {
        const { filename, fileType } = req.body;
        if (!filename || !fileType) return res.status(400).json({ error: 'Missing filename or fileType' });

        const jobId = uuidv4();
        const fileExtension = filename.split('.').pop();
        const s3Key = `${jobId}.${fileExtension}`; 

        const command = new PutObjectCommand({
            Bucket: RAW_BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType
        });
        
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

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

        return res.status(200).json({ jobId, uploadUrl: presignedUrl, s3Key, message: 'Success' });
    } catch (error) {
        console.error("Upload URL Error:", error);
        return res.status(500).json({ error: 'Internal Server Error while generating URL' });
    }
});

// 3. Status Check
app.get('/api/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const params = { TableName: DYNAMO_TABLE_NAME, Key: { 'job_id': { S: jobId } } };
        const { Item } = await dynamoClient.send(new GetItemCommand(params));

        if (!Item) return res.status(404).json({ error: 'Job not found' });
        
        const downloadUrl = Item.download_url ? Item.download_url.S : null;
        return res.status(200).json({ status: Item.status.S, download_url: downloadUrl });
    } catch (error) {
        console.error("Status Check Error:", error);
        return res.status(500).json({ error: 'Internal Server Error while checking status' });
    }
});

module.exports.handler = serverless(app);