import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

const blobServiceClient = BlobServiceClient.fromConnectionString(
  `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT_NAME};AccountKey=${process.env.AZURE_STORAGE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`
);

const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

// Initialize container
const initializeContainer = async () => {
  try {
    // Create the container if it doesn't exist
    const exists = await containerClient.exists();
    if (!exists) {
      console.log(`Creating container "${process.env.AZURE_CONTAINER_NAME}"...`);
      await containerClient.create({
        access: 'blob' // This makes the blobs public readable
      });
      console.log('Container created successfully');
    }
  } catch (error) {
    console.error('Error initializing container:', error);
    throw error;
  }
};

// Initialize container when the module loads
initializeContainer().catch(console.error);

export const uploadToAzure = async (file) => {
  try {
    // Ensure container exists before upload
    const exists = await containerClient.exists();
    if (!exists) {
      await initializeContainer();
    }

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(file.buffer, file.buffer.length, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype
      }
    });
    
    return `${process.env.AZURE_STORAGE_BLOB_URL}/${process.env.AZURE_CONTAINER_NAME}/${blobName}`;
  } catch (error) {
    console.error('Error uploading to Azure:', error);
    throw error;
  }
};
