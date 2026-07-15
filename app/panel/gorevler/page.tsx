import { getProfiles, getTasks } from "../../../lib/supabase/queries";
import TaskBoard from "./TaskBoard";
import { createTask, updateTaskStatus } from "./actions";

export default async function TasksPage() {
  const [tasks, profiles] = await Promise.all([getTasks(), getProfiles()]);
  return <section><TaskBoard tasks={tasks.data as never[]} profiles={profiles.data as never[]} createAction={createTask} statusAction={updateTaskStatus} /></section>;
}
