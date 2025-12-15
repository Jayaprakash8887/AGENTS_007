/**
 * Company-wide configuration settings
 * Centralized configuration for departments, roles, and other company-specific data
 */

// Departments for an IT Services Company
export const DEPARTMENTS = [
  'Engineering',
  'Quality Assurance',
  'DevOps & Infrastructure',
  'Product Management',
  'Project Management',
  'Data Science & Analytics',
  'UI/UX Design',
  'Human Resources',
  'Finance & Accounts',
  'Sales & Business Development',
  'Marketing',
  'Customer Success',
  'IT Support',
  'Legal & Compliance',
  'Operations',
  'Research & Development',
] as const;

// Short names for departments (for display in compact areas)
export const DEPARTMENT_SHORT_NAMES: Record<string, string> = {
  'Engineering': 'Engg',
  'Quality Assurance': 'QA',
  'DevOps & Infrastructure': 'DevOps',
  'Product Management': 'Product',
  'Project Management': 'PM',
  'Data Science & Analytics': 'Data Science',
  'UI/UX Design': 'Design',
  'Human Resources': 'HR',
  'Finance & Accounts': 'Finance',
  'Sales & Business Development': 'Sales',
  'Marketing': 'Marketing',
  'Customer Success': 'CS',
  'IT Support': 'IT Support',
  'Legal & Compliance': 'Legal',
  'Operations': 'Ops',
  'Research & Development': 'R&D',
};

// Employee roles
export const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
] as const;

// Common designations for an IT Services Company
export const DESIGNATIONS = [
  // Engineering
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Software Engineer',
  'Principal Engineer',
  'Technical Lead',
  'Engineering Manager',
  'Architect',
  'Solution Architect',
  'Technical Architect',
  
  // QA
  'QA Engineer',
  'Senior QA Engineer',
  'QA Lead',
  'Test Automation Engineer',
  
  // DevOps
  'DevOps Engineer',
  'Senior DevOps Engineer',
  'Site Reliability Engineer',
  'Cloud Engineer',
  'Infrastructure Engineer',
  
  // Product & Project
  'Product Manager',
  'Senior Product Manager',
  'Product Owner',
  'Project Manager',
  'Senior Project Manager',
  'Program Manager',
  'Delivery Manager',
  'Scrum Master',
  
  // Data
  'Data Engineer',
  'Data Scientist',
  'Data Analyst',
  'ML Engineer',
  
  // Design
  'UI Designer',
  'UX Designer',
  'UI/UX Designer',
  'Senior Designer',
  'Design Lead',
  
  // Business
  'Business Analyst',
  'Sales Executive',
  'Account Manager',
  'Customer Success Manager',
  
  // Management
  'Team Lead',
  'Associate Director',
  'Director',
  'Senior Director',
  'Vice President',
  'Senior Vice President',
  'CTO',
  'CEO',
  
  // HR & Admin
  'HR Executive',
  'HR Manager',
  'Recruiter',
  'Admin Executive',
  
  // Finance
  'Accountant',
  'Finance Executive',
  'Finance Manager',
] as const;

// Employment types
export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
] as const;

// Get department options for dropdowns
export function getDepartmentOptions() {
  return DEPARTMENTS.map(dept => ({
    value: dept,
    label: dept,
  }));
}

// Get all departments as array
export function getAllDepartments(): string[] {
  return [...DEPARTMENTS];
}

export type Department = typeof DEPARTMENTS[number];
export type Role = typeof ROLES[number]['value'];
export type Designation = typeof DESIGNATIONS[number];
