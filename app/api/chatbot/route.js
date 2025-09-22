import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../src/lib/prisma';

// GET /api/chatbot - Fetch all questions, grouped by category
export async function GET() {
  try {
    const questions = await prisma.chatbotQA.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    const groupedByCategory = questions.reduce((acc, question) => {
      const { category } = question;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(question);
      return acc;
    }, {});

    return NextResponse.json(groupedByCategory);
  } catch (error) {
    console.error('Error fetching chatbot questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST /api/chatbot - Add a new question
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { question, answer, category, hasBookNow } = body;

    if (!question || !answer || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newQuestion = await prisma.chatbotQA.create({
      data: {
        question,
        answer,
        category,
        hasBookNow: !!hasBookNow,
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating chatbot question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}