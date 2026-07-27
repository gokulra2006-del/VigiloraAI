import { useState, useCallback, useMemo, createContext, useContext, type ReactNode } from "react";
import type { AIModel } from "@/types/models";
import { MOCK_MODELS } from "@/services/model-data";

interface ModelStoreContextType {
  models: AIModel[];
  activeModelId: string | null;
  setActiveModelId: (id: string | null) => void;
  toggleModelStatus: (id: string) => void;
  getActiveModel: () => AIModel | undefined;
}

const ModelStoreContext = createContext<ModelStoreContextType | undefined>(undefined);

export function ModelStoreProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<AIModel[]>(MOCK_MODELS);
  
  // By default, the first primary running model is active
  const [activeModelId, setActiveModelId] = useState<string | null>(
    models.find(m => m.isActive)?.id || models[0]?.id || null
  );

  const toggleModelStatus = useCallback((id: string) => {
    setModels(prev => prev.map(model => {
      if (model.id === id) {
        const newEnabled = !model.enabled;
        return {
          ...model,
          enabled: newEnabled,
          status: newEnabled ? "running" : "offline",
          isActive: newEnabled ? model.isActive : false // Disable active if turned off
        };
      }
      return model;
    }));
  }, []);

  const getActiveModel = useCallback(() => {
    return models.find(m => m.id === activeModelId);
  }, [models, activeModelId]);

  const value = useMemo(() => ({
    models,
    activeModelId,
    setActiveModelId,
    toggleModelStatus,
    getActiveModel
  }), [models, activeModelId, toggleModelStatus, getActiveModel]);

  return (
    <ModelStoreContext.Provider value={value}>
      {children}
    </ModelStoreContext.Provider>
  );
}

export function useModelStore() {
  const context = useContext(ModelStoreContext);
  if (context === undefined) {
    throw new Error("useModelStore must be used within a ModelStoreProvider");
  }
  return context;
}
