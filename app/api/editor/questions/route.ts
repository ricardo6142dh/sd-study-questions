import { NextResponse } from "next/server";
import { upsertQuestion } from "@/lib/question-editor";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as {
      courseSlug?: string;
      questionId?: string;
      moduleSlug?: string;
      topicSlug?: string;
      prompt?: string;
      options?: string[];
      correctOption?: number;
      explanation?: string;
      reviewWhy?: string;
    };

    const result = await upsertQuestion({
      courseSlug: payload.courseSlug || "",
      questionId: payload.questionId,
      moduleSlug: payload.moduleSlug || "",
      topicSlug: payload.topicSlug || "",
      prompt: payload.prompt || "",
      options: payload.options || [],
      correctOption: payload.correctOption ?? -1,
      explanation: payload.explanation || "",
      reviewWhy: payload.reviewWhy || ""
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a questão.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
