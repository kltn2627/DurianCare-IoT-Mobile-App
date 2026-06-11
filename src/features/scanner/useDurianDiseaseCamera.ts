import { type CameraCapturedPicture, CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type DiseasePrediction,
  predictDurianDisease,
} from "./diseasePredictionApi";

type ScannerPhase = "idle" | "capturing" | "uploading" | "success" | "error";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Không thể phân tích ảnh lá. Vui lòng kiểm tra mạng và thử lại.";
}

export function useDurianDiseaseCamera() {
  const cameraRef = useRef<CameraView>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScannerPhase>("idle");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [prediction, setPrediction] = useState<DiseasePrediction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(function abortRequestOnUnmount() {
    return () => requestControllerRef.current?.abort();
  }, []);

  const analyzePhoto = useCallback(async (capturedPhoto: CameraCapturedPicture) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setPhase("uploading");
    setErrorMessage(null);

    try {
      const result = await predictDurianDisease(capturedPhoto, controller.signal);
      if (!controller.signal.aborted) {
        setPrediction(result);
        setPhase("success");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErrorMessage(toErrorMessage(error));
        setPhase("error");
      }
    }
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || phase === "capturing" || phase === "uploading") return;

    setPhase("capturing");
    setPrediction(null);
    setErrorMessage(null);

    try {
      const capturedPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });
      setPhoto(capturedPhoto);
      await analyzePhoto(capturedPhoto);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setPhase("error");
    }
  }, [analyzePhoto, phase]);

  const retryAnalysis = useCallback(async () => {
    if (photo) await analyzePhoto(photo);
  }, [analyzePhoto, photo]);

  const reset = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setPhoto(null);
    setPrediction(null);
    setErrorMessage(null);
    setPhase("idle");
  }, []);

  return {
    cameraRef,
    captureAndAnalyze,
    errorMessage,
    hasPermission: permission?.granted === true,
    isBusy: phase === "capturing" || phase === "uploading",
    permission,
    phase,
    photo,
    prediction,
    requestPermission,
    reset,
    retryAnalysis,
  };
}
