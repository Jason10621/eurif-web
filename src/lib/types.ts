// DB row types — public schema (see supabase/migrations/0001_init.sql)

export type Role = "leader" | "member";
export type Part = "정보학" | "약학" | "뇌과학·수면위상" | "생명공학" | "정책";
export type PhaseStatus = "planned" | "active" | "done";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type ResourceCategory =
  | "논문" | "연구자료" | "실험자료" | "데이터" | "참고링크" | "정책" | "기타";

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  "논문",
  "연구자료",
  "실험자료",
  "데이터",
  "참고링크",
  "정책",
  "기타",
];

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  part: Part | null;
  student_no: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInfo {
  id: number;
  title: string;
  subtitle: string;
  description: string | null;
  target_sample: number;
  collected_sample: number;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
}

export interface Phase {
  id: number;
  phase_no: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: PhaseStatus;
  progress: number;
  order_index: number;
  updated_at: string;
}

export interface ProjectGoal {
  id: number;
  title: string;
  category: string;
  weight: number;
  done: boolean;
  order_index: number;
  updated_at: string;
}

export interface AnalysisResult {
  id: number;
  variable: string;
  beta: number | null;
  beta_std: number | null;
  p_value: number | null;
  vif: number | null;
  r2_individual: number | null;
  is_final: boolean;
  note: string | null;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  created_by: string;
  phase_id: number | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at: string | null;
  submission_note: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface Log {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  log_date: string;
  phase_id: number | null;
  task_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  part: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// convenience shapes for joined queries
export type TaskWithAssignee = Task & { assignee: Pick<Profile, "name" | "part"> | null };
export type LogWithAuthor = Log & { author: Pick<Profile, "name" | "part"> | null };
export type ResourceWithUploader = Resource & { uploader: Pick<Profile, "name"> | null };
export type ResourceItem = ResourceWithUploader & { downloadUrl: string | null };

export type NotificationType =
  | "task" | "task_done" | "log" | "resource" | "phase" | "announce";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  group_id: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  author_id: string | null;
  pinned: boolean;
  created_at: string;
}
