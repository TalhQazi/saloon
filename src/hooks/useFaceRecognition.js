// Custom Hook for Face Recognition Operations
import { useState, useCallback } from 'react';
import faceRecognitionService from '../api/faceRecognitionService';

export const useFaceRecognition = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear last result
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Initialize face collection
  const initializeCollection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.createFaceCollection();
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to initialize face collection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register employee face
  const registerEmployeeFace = useCallback(
    async (imagePath, employeeId, employeeName) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await faceRecognitionService.indexFace(
          imagePath,
          employeeId,
          employeeName,
        );
        setLastResult(result);
        return result;
      } catch (err) {
        setError(err.message || 'Failed to register employee face');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Recognize employee face
  const recognizeEmployee = useCallback(async (imagePath, threshold = 90) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.searchFaceByImage(
        imagePath,
        threshold,
      );
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to recognize employee');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Compare two faces
  const compareFaces = useCallback(
    async (sourceImagePath, targetImagePath, threshold = 90) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await faceRecognitionService.compareFaces(
          sourceImagePath,
          targetImagePath,
          threshold,
        );
        setLastResult(result);
        return result;
      } catch (err) {
        setError(err.message || 'Failed to compare faces');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Detect faces in image
  const detectFaces = useCallback(async imagePath => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.detectFaces(imagePath);
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to detect faces');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // List all registered faces
  const listRegisteredFaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.listFaces();
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to list registered faces');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete employee face
  const deleteEmployeeFace = useCallback(async faceId => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.deleteFace(faceId);
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to delete employee face');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get collection info
  const getCollectionInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.describeCollection();
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to get collection info');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test AWS Rekognition connection
  const testConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await faceRecognitionService.testConnection();
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to test AWS connection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Complete authentication flow
  const authenticateEmployee = useCallback(
    async (imagePath, threshold = 90) => {
      setIsLoading(true);
      setError(null);

      try {
        // First detect if there's a face in the image
        const detectionResult = await faceRecognitionService.detectFaces(
          imagePath,
        );

        if (!detectionResult.hasFaces) {
          throw new Error('No face detected in the image');
        }

        if (detectionResult.faceCount > 1) {
          throw new Error(
            'Multiple faces detected. Please ensure only one face is visible',
          );
        }

        // Now search for the face in our collection
        const recognitionResult =
          await faceRecognitionService.searchFaceByImage(imagePath, threshold);

        setLastResult(recognitionResult);
        return recognitionResult;
      } catch (err) {
        setError(err.message || 'Authentication failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    // State
    isLoading,
    error,
    lastResult,

    // Actions
    clearError,
    clearResult,

    // Core functions
    initializeCollection,
    registerEmployeeFace,
    recognizeEmployee,
    compareFaces,
    detectFaces,
    listRegisteredFaces,
    deleteEmployeeFace,
    getCollectionInfo,
    testConnection,

    // Convenience functions
    authenticateEmployee,
  };
};

export default useFaceRecognition;
