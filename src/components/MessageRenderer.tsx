import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArtifactRenderer } from './ArtifactRenderer';

interface MessageRendererProps {
  content: string;
}

export function MessageRenderer({ content }: MessageRendererProps) {
  // Regex to match [AURA_ARTIFACT type="..."]...[/AURA_ARTIFACT]
  // Uses global flag, allows for properties inside tags
  const blockRegex = /\[AURA_ARTIFACT\s+type="([^"]+)"\]([\s\S]*?)\[\/AURA_ARTIFACT\]/g;
  
  const blocks: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    // Push preceding text as markdown
    if (match.index > lastIndex) {
      let text = content.slice(lastIndex, match.index).trim();
      
      // Heuristic to remove duplicated raw JSON that the LLM accidentally prints before the artifact block
      if (text.startsWith('{') && text.endsWith('}') && text.includes('"title"')) {
         try {
           JSON.parse(text);
           // If it parses successfully as JSON right before the artifact, it's a hallucinated pure-JSON text block
           text = '';
         } catch(e) {}
      }

      if (text.startsWith('```json') && text.endsWith('```') && text.includes('"title"')) {
         try {
           let inner = text.replace(/^```json/, '').replace(/```$/, '').trim();
           JSON.parse(inner);
           text = '';
         } catch(e) {}
      }

      if (text) {
        blocks.push(
          <div key={`text-${lastIndex}`} className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:glass-panel prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-white prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-white/70">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        );
      }
    }

    // Push the artifact block
    const type = match[1] as any;
    const payloadStr = match[2].trim();
    
    let payload = { data: [] };
    try {
      // Clean up markdown block formatting if the AI added it inside the artifact block
      let cleanPayloadStr = payloadStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      payload = JSON.parse(cleanPayloadStr);
    } catch (e) {
      console.warn("Failed to parse artifact JSON payload:", payloadStr);
    }

    blocks.push(
      <ArtifactRenderer
        key={`artifact-${match.index}`}
        artifact={{ type, payload }}
      />
    );

    lastIndex = blockRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    let text = content.slice(lastIndex).trim();

    if (text.startsWith('{') && text.endsWith('}') && text.includes('"title"')) {
       try {
         JSON.parse(text);
         text = '';
       } catch(e) {}
    }

    if (text.startsWith('```json') && text.endsWith('```') && text.includes('"title"')) {
       try {
         let inner = text.replace(/^```json/, '').replace(/```$/, '').trim();
         JSON.parse(inner);
         text = '';
       } catch(e) {}
    }

    if (text) {
      blocks.push(
        <div key={`text-${lastIndex}`} className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:glass-panel prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-white prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-white/70">
             <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks}
    </div>
  );
}
