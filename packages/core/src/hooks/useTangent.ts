import { useState, useEffect, useCallback, useRef } from "react";
import type { TangentConfig, TangentValue } from "../types";
import { useTangentContext } from "../context/TangentContext";
import { getStoredConfig } from "../store";

interface UseTangentOptions {
  filePath?: string;
}

const isDev = process.env.NODE_ENV === "development";

export function useTangent<T extends TangentConfig>(
  id: string,
  defaultValues: T,
  options: UseTangentOptions = {},
): T & { tangentProps: { "data-tangent-id": string }; tangentId: string } {
  // Production: return default values directly (zero overhead)
  if (!isDev) {
    return {
      ...defaultValues,
      tangentProps: { "data-tangent-id": id },
      tangentId: id,
    };
  }

  return useTangentDev(id, defaultValues, options);
}

function useTangentDev<T extends TangentConfig>(
  id: string,
  defaultValues: T,
  options: UseTangentOptions,
): T & { tangentProps: { "data-tangent-id": string }; tangentId: string } {
  const { register, unregister, endpoint } = useTangentContext();

  const storedConfig = getStoredConfig(id);
  const [values, setValues] = useState<T>(
    () => (storedConfig as T) ?? defaultValues,
  );

  const filePathRef = useRef(options.filePath);
  const idRef = useRef(id);
  const defaultValuesRef = useRef(defaultValues);
  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  // Handle updates from the control panel (just update local state, no server request)
  const handleUpdate = useCallback((key: string, value: TangentValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Save a single key to the source file (called when user clicks Save)
  const handleSave = useCallback(async (key: string, value: TangentValue) => {
    const filePath = filePathRef.current;
    if (!filePath) {
      console.warn("[tangent] No filePath provided, skipping server update");
      return;
    }

    try {
      const response = await fetch(endpointRef.current, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, id: idRef.current, key, value }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[tangent] Save failed:", error);
        throw new Error(error.message || "Save failed");
      }
    } catch (error) {
      console.error("[tangent] Network error:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      register({
        id,
        filePath: filePathRef.current || "",
        originalConfig: { ...defaultValuesRef.current },
        currentConfig: { ...defaultValuesRef.current },
        sourceConfig: { ...defaultValuesRef.current },
        onUpdate: handleUpdate,
        onSave: handleSave,
      });
    });

    return () => unregister(id);
  }, [id, register, unregister, handleUpdate, handleSave]);

  const tangentProps = { "data-tangent-id": id };

  return {
    ...values,
    tangentProps,
    tangentId: id,
  };
}
