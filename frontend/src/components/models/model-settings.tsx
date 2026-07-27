import { useState } from "react";
import { MOCK_SETTINGS } from "@/services/model-data";
import { useModelStore } from "@/hooks/use-model-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Settings2, Save } from "lucide-react";

export function ModelSettings() {
  const { getActiveModel } = useModelStore();
  const activeModel = getActiveModel();
  
  const initialSettings = activeModel ? (MOCK_SETTINGS[activeModel.id] || MOCK_SETTINGS["mod-001"]) : MOCK_SETTINGS["mod-001"];
  const [settings, setSettings] = useState(initialSettings);
  const [isDirty, setIsDirty] = useState(false);

  if (!activeModel) return null;

  const handleSave = () => {
    // In a real app, this would be an API call
    setIsDirty(false);
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="text-primary" />
          Configuration: {activeModel.name}
        </CardTitle>
        <CardDescription>Adjust inference parameters and system behavior for this model.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Thresholds */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold border-b pb-2">Detection Thresholds</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Confidence Threshold</label>
              <span className="text-sm text-muted-foreground">{settings.confidenceThreshold.toFixed(2)}</span>
            </div>
            <Slider 
              min={0.1} max={0.99} step={0.01} 
              value={settings.confidenceThreshold} 
              onChange={(e) => {
                setSettings({...settings, confidenceThreshold: parseFloat(e.target.value)});
                setIsDirty(true);
              }} 
            />
            <p className="text-xs text-muted-foreground">Minimum confidence score required to trigger a detection.</p>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex justify-between">
              <label className="text-sm font-medium">NMS Threshold (Overlap)</label>
              <span className="text-sm text-muted-foreground">{settings.nmsThreshold.toFixed(2)}</span>
            </div>
            <Slider 
              min={0.1} max={0.99} step={0.01} 
              value={settings.nmsThreshold} 
              onChange={(e) => {
                setSettings({...settings, nmsThreshold: parseFloat(e.target.value)});
                setIsDirty(true);
              }} 
            />
            <p className="text-xs text-muted-foreground">Non-Maximum Suppression threshold to merge overlapping bounding boxes.</p>
          </div>
        </div>

        {/* Hardware & Scaling */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold border-b pb-2">Hardware & Scaling</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto-Scaling</label>
              <p className="text-xs text-muted-foreground">Automatically spin up new model instances under high load.</p>
            </div>
            <Switch 
              checked={settings.autoScaling} 
              onCheckedChange={(checked) => {
                setSettings({...settings, autoScaling: checked});
                setIsDirty(true);
              }} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Inference Mode</label>
              <p className="text-xs text-muted-foreground">Force execution on specific hardware.</p>
            </div>
            <select 
              className="bg-input border-none rounded-md text-sm p-2 focus:ring-2 outline-none"
              value={settings.inferenceMode}
              onChange={(e) => {
                setSettings({...settings, inferenceMode: e.target.value as any});
                setIsDirty(true);
              }}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="gpu">GPU Only</option>
              <option value="cpu">CPU Only</option>
            </select>
          </div>
        </div>

      </CardContent>
      <CardFooter className="bg-muted/30 border-t flex justify-end gap-3 pt-6">
        <Button variant="outline" onClick={() => {
          setSettings(initialSettings);
          setIsDirty(false);
        }} disabled={!isDirty}>Discard Changes</Button>
        <Button onClick={handleSave} disabled={!isDirty} className="gap-2">
          <Save size={16} />
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}
