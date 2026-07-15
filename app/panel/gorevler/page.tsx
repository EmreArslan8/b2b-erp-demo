import { getCurrentProfile, getProfiles, getTasks } from "../../../lib/supabase/queries";
import TaskBoard from "./TaskBoard";
import { createTask, deleteTask, updateTaskStatus } from "./actions";

export default async function TasksPage() {
  const [tasks, profiles, profile] = await Promise.all([getTasks(), getProfiles(), getCurrentProfile()]);
  const canManageTasks = profile.data?.role === "admin" || profile.data?.role === "super_admin";
  return <section><TaskBoard tasks={tasks.data as never[]} profiles={profiles.data as never[]} canManageTasks={canManageTasks} canDeleteTasks={canManageTasks} createAction={createTask} statusAction={updateTaskStatus} deleteAction={deleteTask} /></section>;
}
