import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function GET() {
  console.log('Testing OpenAI API...');
  
  try {
    // 간단한 테스트 요청
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say 'Hello, World!' in Korean."
        }
      ],
      max_tokens: 50
    });
    
    console.log('OpenAI test successful');
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API is working',
      response: response.choices[0].message.content,
      model: response.model
    });
  } catch (error) {
    console.error('OpenAI test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}