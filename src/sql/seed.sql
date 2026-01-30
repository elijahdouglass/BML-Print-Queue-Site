use bml;

INSERT INTO users (id, name, email, discord, createdAt, updatedAt)
VALUES
(
  'user_1',
  'Alice Johnson',
  'alice@example.com',
  'alice#1234',
  NOW(),
  NOW()
),
(
  'user_2',
  'Bob Smith',
  'bob@example.com',
  NULL,
  NOW(),
  NOW()
);

-- =========================
-- PRINT JOBS
-- =========================

INSERT INTO print_jobs (
  id,
  userId,
  partName,
  quantity,
  color,
  material,
  userSuppliedMaterial,
  specialInstructions,
  stlUrl,
  status,
  createdAt,
  updatedAt,
  completedAt
)
VALUES
(
  'job_1',
  'user_1',
  'Gear Housing',
  2,
  'Black',
  'PLA',
  FALSE,
  'High infill required',
  'https://example.com/models/gear_housing.stl',
  'PENDING',
  NOW(),
  NOW(),
  NULL
),
(
  'job_2',
  'user_1',
  'Camera Mount',
  1,
  'White',
  'PETG',
  TRUE,
  NULL,
  'https://example.com/models/camera_mount.stl',
  'IN_PROGRESS',
  NOW(),
  NOW(),
  NULL
),
(
  'job_3',
  'user_2',
  'Drone Frame',
  1,
  'Red',
  'ABS',
  FALSE,
  'Print with brim to prevent warping',
  'https://example.com/models/drone_frame.stl',
  'COMPLETED',
  NOW(),
  NOW(),
  NOW()
);
