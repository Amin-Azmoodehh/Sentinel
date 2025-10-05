import { resolvePreferredProvider } from './providerService.js';
import { ShellService } from './shellService.js';
import * as taskService from './taskService.js';

const shellService = ShellService.getInstance();

const buildPrdPrompt = (prdContent: string): string => {
  return `
    Based on the following Product Requirements Document (PRD), please generate a structured list of tasks in JSON format.
    Each task object should contain:
    - "title": A concise and descriptive title for the task.
    - "description": A brief explanation of what needs to be done.
    - "dependencies": An array of titles of other tasks that this task depends on.

    PRD Content:
    ---
    ${prdContent}
    ---

    Please provide only the JSON array of tasks in your response.
  `;
};

export const estimateTaskComplexity = async (
  task: taskService.TaskRecord
): Promise<{ complexity: number; confidence: number }> => {
  const provider = resolvePreferredProvider();
  if (!provider) {
    throw new Error('No preferred AI provider is configured or available.');
  }

  const prompt = `
    Based on the following task, estimate its complexity on a scale from 1 (very simple) to 10 (very complex).
    Also provide a confidence score for your estimation from 0 (not confident) to 1 (very confident).
    Return the result as a JSON object with "complexity" and "confidence" keys.

    Task Title: ${task.title}
    Task Description: ${task.description}

    Please provide only the JSON object in your response.
  `;

  const result = await shellService.executeCommand(
    `"${provider.path}" -p "${prompt.replace(/"/g, '\\"')}"`,
    {
      isProviderCommand: true,
    }
  );

  if (!result.success) {
    throw new Error(`AI provider execution failed: ${result.stderr}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

export const suggestNextActions = async (): Promise<string[]> => {
  const provider = resolvePreferredProvider();
  if (!provider) {
    throw new Error('No preferred AI provider is configured or available.');
  }

  const openTasks = taskService.listTasks('open');
  const prompt = `
    Given the following open tasks, suggest 3 next actions or tasks to work on.
    Return the result as a JSON array of strings.

    Open Tasks:
    ${openTasks.map((t) => `- ${t.title}`).join('\n')}

    Please provide only the JSON array in your response.
  `;

  const result = await shellService.executeCommand(
    `"${provider.path}" -p "${prompt.replace(/"/g, '\\"')}"`,
    {
      isProviderCommand: true,
    }
  );

  if (!result.success) {
    throw new Error(`AI provider execution failed: ${result.stderr}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

export const parsePrdToTasks = async (prdContent: string): Promise<taskService.TaskRecord[]> => {
  const provider = resolvePreferredProvider();
  if (!provider) {
    throw new Error('No preferred AI provider is configured or available.');
  }

  const prompt = buildPrdPrompt(prdContent);
  const result = await shellService.executeCommand(
    `"${provider.path}" -p "${prompt.replace(/"/g, '\\"')}"`,
    {
      isProviderCommand: true,
    }
  );

  if (!result.success) {
    throw new Error(`AI provider execution failed: ${result.stderr}`);
  }

  try {
    const parsedTasks: { title: string; description: string; dependencies: string[] }[] =
      JSON.parse(result.stdout);

    const createdTasks: taskService.TaskRecord[] = [];
    const taskTitleToId: { [title: string]: number } = {};

    // First pass: create all tasks
    for (const task of parsedTasks) {
      const created = taskService.createTask({ title: task.title, description: task.description });
      createdTasks.push(created);
      taskTitleToId[created.title] = created.id;
    }

    // Second pass: add dependencies
    for (const task of parsedTasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        const taskId = taskTitleToId[task.title];
        for (const depTitle of task.dependencies) {
          const depId = taskTitleToId[depTitle];
          if (taskId && depId) {
            taskService.addTaskDependency(taskId, depId);
          }
        }
      }
    }

    return createdTasks;
  } catch (error) {
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
