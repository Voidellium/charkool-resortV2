-- Seed initial 3D model configurations
INSERT INTO "ThreeDModelConfig" ("modelType", "modelPath", "updatedAt")
VALUES 
  ('RESORT_MAP', '/models/WholeMap_12.glb', NOW()),
  ('INTERIOR_TEEPEE', '/models/Interior_Teepee.glb', NOW()),
  ('INTERIOR_VILLA', '/models/Interior_Villa.glb', NOW()),
  ('INTERIOR_LOFT', '/models/Interior_Loft.glb', NOW())
ON CONFLICT ("modelType") DO NOTHING;
