// ultima-agent-web/src/app/api/update-prompt/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { newPromptContent } = await request.json();

    if (!newPromptContent) {
      return NextResponse.json({ error: 'New prompt content is required' }, { status: 400 });
    }

    // In a real application, this is where you would:
    // 1. Authenticate and authorize the request.
    // 2. Interact with a Git API (e.g., GitHub API) to:
    //    a. Fetch the current prompt file.
    //    b. Create a new branch.
    //    c. Commit the updated content to the new branch.
    //    d. Create a pull request for human review.
    // 3. Potentially notify a human reviewer.

    console.log('--- Agent Proposed System Prompt Update ---');
    console.log('Proposed New Prompt Content:', newPromptContent);
    console.log('--- End Proposed Update ---');
    console.log('A Pull Request for the system prompt update has been conceptually created and is awaiting human review and approval.');

    // Simulate reading the current prompt (for client to see what it *would* be)
    const filePath = path.join(process.cwd(), 'src/config/system_prompts/default.json');
    const currentContent = await fs.readFile(filePath, 'utf-8');
    const currentPrompt = JSON.parse(currentContent);

    return NextResponse.json({
      message: 'System prompt update proposed successfully (simulated PR created). Awaiting review.',
      proposedContent: newPromptContent,
      currentLivePrompt: currentPrompt.prompt // Showing current live prompt for context
    });
  } catch (error) {
    console.error('Error proposing system prompt update:', error);
    return NextResponse.json({ error: 'Failed to propose system prompt update' }, { status: 500 });
  }
}

// Optionally, add a GET endpoint to read the current prompt
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/config/system_prompts/default.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const systemPrompt = JSON.parse(content);
    return NextResponse.json(systemPrompt);
  } catch (error) {
    console.error('Error reading system prompt:', error);
    return NextResponse.json({ error: 'Failed to read system prompt' }, { status: 500 });
  }
}
