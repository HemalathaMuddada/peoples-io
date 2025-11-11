export interface StreamMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: any[];
}

export async function* streamChat(
  messages: StreamMessage[],
  onDelta: (deltaText: string) => void,
  profileId?: string,
  accessToken?: string
): AsyncGenerator<void, void, void> {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-coach`;
  
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ 
      messages,
      profileId 
    }),
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${resp.status}`);
  }

  // Check content type - could be JSON (tool response) or SSE (streaming)
  const contentType = resp.headers.get("content-type");
  
  if (contentType?.includes("application/json")) {
    // Handle JSON response (tool execution result)
    const data = await resp.json();
    if (data.content) {
      onDelta(data.content);
    }
    return;
  }

  if (!resp.body) {
    throw new Error("No response body");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          onDelta(content);
          yield;
        }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          onDelta(content);
          yield;
        }
      } catch {}
    }
  }
}
