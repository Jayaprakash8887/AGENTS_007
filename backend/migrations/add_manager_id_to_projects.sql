-- Add manager_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id UUID;

-- Add foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_manager 
FOREIGN KEY (manager_id) 
REFERENCES employees(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
