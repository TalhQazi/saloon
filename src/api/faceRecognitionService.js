// Face Recognition Service using AWS Rekognition
import { rekognition, FACE_COLLECTION_NAME, logAWS } from './aws-config';
import RNFS from 'react-native-fs';

class FaceRecognitionService {
  constructor() {
    this.collectionName = FACE_COLLECTION_NAME;
  }

  // Create face collection for storing employee faces
  async createFaceCollection() {
    try {
      logAWS('Creating face collection...');

      const params = {
        CollectionId: this.collectionName,
      };

      const result = await rekognition.createCollection(params).promise();
      logAWS('Face collection created successfully', result);

      return {
        success: true,
        collectionArn: result.CollectionARN,
        statusCode: result.StatusCode,
      };
    } catch (error) {
      logAWS('Error creating face collection', error);

      if (error.code === 'ResourceAlreadyExistsException') {
        return {
          success: true,
          message: 'Collection already exists',
          statusCode: 200,
        };
      }

      throw error;
    }
  }

  async ensureCollectionExists() {
    try {
      await this.describeCollection();
      return true;
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        await this.createFaceCollection();
        return true;
      }
      throw error;
    }
  }

  // Index a face (store employee face in collection)
  async indexFace(imagePath, employeeId, employeeName) {
    try {
      logAWS('Indexing face for employee', { employeeId, employeeName });

      await this.ensureCollectionExists();

      // Read image file and convert to base64
      const imageData = await RNFS.readFile(imagePath, 'base64');

      const params = {
        CollectionId: this.collectionName,
        Image: {
          Bytes: Buffer.from(imageData, 'base64'),
        },
        ExternalImageId: employeeId,
        DetectionAttributes: ['ALL'],
      };

      const result = await rekognition.indexFaces(params).promise();
      logAWS('Face indexed successfully', result);

      return {
        success: true,
        faceRecords: result.FaceRecords,
        faceId: result.FaceRecords[0]?.Face?.FaceId,
        confidence: result.FaceRecords[0]?.Face?.Confidence,
      };
    } catch (error) {
      // Retry once if collection was missing
      if (error.code === 'ResourceNotFoundException') {
        await this.createFaceCollection();
        return this.indexFace(imagePath, employeeId, employeeName);
      }
      logAWS('Error indexing face', error);
      throw error;
    }
  }

  // Search for a face in the collection
  async searchFaceByImage(imagePath, threshold = 90) {
    try {
      logAWS('Searching for face in collection...');

      await this.ensureCollectionExists();

      // Read image file and convert to base64
      const imageData = await RNFS.readFile(imagePath, 'base64');

      const params = {
        CollectionId: this.collectionName,
        Image: {
          Bytes: Buffer.from(imageData, 'base64'),
        },
        MaxFaces: 10,
        FaceMatchThreshold: threshold,
      };

      const result = await rekognition.searchFacesByImage(params).promise();
      logAWS('Face search completed', result);

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const bestMatch = result.FaceMatches[0];
        return {
          success: true,
          found: true,
          employeeId: bestMatch.Face.ExternalImageId,
          confidence: bestMatch.Similarity,
          faceId: bestMatch.Face.FaceId,
        };
      } else {
        return {
          success: true,
          found: false,
          message: 'No matching face found',
        };
      }
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        await this.createFaceCollection();
        return this.searchFaceByImage(imagePath, threshold);
      }
      logAWS('Error searching face', error);
      throw error;
    }
  }

  // Compare two faces directly
  async compareFaces(sourceImagePath, targetImagePath, threshold = 90) {
    try {
      logAWS('Comparing two faces...');

      // Not tied to a collection but keep detect pre-checks
      const sourceImageData = await RNFS.readFile(sourceImagePath, 'base64');
      const targetImageData = await RNFS.readFile(targetImagePath, 'base64');

      const params = {
        SourceImage: {
          Bytes: Buffer.from(sourceImageData, 'base64'),
        },
        TargetImage: {
          Bytes: Buffer.from(targetImageData, 'base64'),
        },
        SimilarityThreshold: threshold,
      };

      const result = await rekognition.compareFaces(params).promise();
      logAWS('Face comparison completed', result);

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const match = result.FaceMatches[0];
        return {
          success: true,
          match: true,
          similarity: match.Similarity,
          confidence: match.Similarity >= threshold,
        };
      } else {
        return {
          success: true,
          match: false,
          similarity: 0,
        };
      }
    } catch (error) {
      logAWS('Error comparing faces', error);
      throw error;
    }
  }

  // Detect faces in an image
  async detectFaces(imagePath) {
    try {
      logAWS('Detecting faces in image...');

      const imageData = await RNFS.readFile(imagePath, 'base64');

      const params = {
        Image: {
          Bytes: Buffer.from(imageData, 'base64'),
        },
        Attributes: ['ALL'],
      };

      const result = await rekognition.detectFaces(params).promise();
      logAWS('Face detection completed', result);

      return {
        success: true,
        faceCount: result.FaceDetails.length,
        faces: result.FaceDetails,
        hasFaces: result.FaceDetails.length > 0,
      };
    } catch (error) {
      logAWS('Error detecting faces', error);
      throw error;
    }
  }

  // List all faces in collection
  async listFaces() {
    try {
      logAWS('Listing all faces in collection...');

      await this.ensureCollectionExists();

      const params = {
        CollectionId: this.collectionName,
        MaxResults: 100,
      };

      const result = await rekognition.listFaces(params).promise();
      logAWS('Faces listed successfully', result);

      return {
        success: true,
        faces: result.Faces,
        faceCount: result.Faces.length,
      };
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        await this.createFaceCollection();
        return this.listFaces();
      }
      logAWS('Error listing faces', error);
      throw error;
    }
  }

  // Delete a specific face from collection
  async deleteFace(faceId) {
    try {
      logAWS('Deleting face from collection...', { faceId });

      await this.ensureCollectionExists();

      const params = {
        CollectionId: this.collectionName,
        FaceIds: [faceId],
      };

      const result = await rekognition.deleteFaces(params).promise();
      logAWS('Face deleted successfully', result);

      return {
        success: true,
        deletedFaces: result.DeletedFaces,
        deletedFaceCount: result.DeletedFaces.length,
      };
    } catch (error) {
      logAWS('Error deleting face', error);
      throw error;
    }
  }

  // Delete face collection
  async deleteFaceCollection() {
    try {
      logAWS('Deleting face collection...');

      const params = {
        CollectionId: this.collectionName,
      };

      const result = await rekognition.deleteCollection(params).promise();
      logAWS('Face collection deleted successfully', result);

      return {
        success: true,
        statusCode: result.StatusCode,
      };
    } catch (error) {
      logAWS('Error deleting face collection', error);
      throw error;
    }
  }

  // Get collection info
  async describeCollection() {
    try {
      logAWS('Describing face collection...');

      const params = {
        CollectionId: this.collectionName,
      };

      const result = await rekognition.describeCollection(params).promise();
      logAWS('Collection description retrieved', result);

      return {
        success: true,
        collection: result,
      };
    } catch (error) {
      logAWS('Error describing collection', error);
      throw error;
    }
  }

  // Test function to verify AWS Rekognition is working
  async testConnection() {
    try {
      logAWS('Testing AWS Rekognition connection...');

      // Try to list collections to test connection
      const params = {
        MaxResults: 10,
      };

      const result = await rekognition.listCollections(params).promise();
      logAWS('AWS Rekognition connection test successful', result);

      return {
        success: true,
        collections: result.CollectionIds,
        message: 'AWS Rekognition connection successful',
      };
    } catch (error) {
      logAWS('AWS Rekognition connection test failed', error);
      throw error;
    }
  }
}

// Create singleton instance
const faceRecognitionService = new FaceRecognitionService();

export default faceRecognitionService;
