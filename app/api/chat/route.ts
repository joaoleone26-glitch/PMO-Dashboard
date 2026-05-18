import { NextRequest, NextResponse } from 'next/server';
import { chatWithProjects } from '@/lib/projectAnalyzer';
import { Project, ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, projects, history } = body as {
      message: string;
      projects: Project[];
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const apiHistory = history.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await chatWithProjects(message, projects || [], apiHistory);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Erro ao processar mensagem' }, { status: 500 });
  }
}
