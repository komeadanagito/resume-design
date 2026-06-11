export type AnthropicTextDelta = {
  type: "content_block_delta";
  delta: { type: "text_delta"; text: string };
};

export type AnthropicMessageStop = { type: "message_stop" };

export type AnthropicStreamEvent = AnthropicTextDelta | AnthropicMessageStop | { type: string; delta?: { type: string; text?: string } };

export type AnthropicMessageStream = AsyncIterable<AnthropicStreamEvent>;

export type AnthropicLikeClient = {
  messages: {
    stream(args?: unknown): AnthropicMessageStream;
  };
};
