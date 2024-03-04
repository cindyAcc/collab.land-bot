import { getFetch, handleFetchResponse, sleep } from "@collabland/common";
import {
  APIChatInputApplicationCommandInteraction,
  APIMessage,
  DiscordActionRequest, MessageFlags,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody
} from "@collabland/discord";

const fetch = getFetch();

export class FollowUp {
  async followupMessage(
    request: DiscordActionRequest<APIChatInputApplicationCommandInteraction>,
    message: RESTPostAPIWebhookWithTokenJSONBody,
    defaultMessage: string = "Server error, please retry later."
  ) {
    const callback = request.actionContext?.callbackUrl;
    if (callback) {
      await sleep(100);
      const res = await fetch(callback, {
        method: "post",
        body: JSON.stringify(message),
      });
      try {
        return await handleFetchResponse<APIMessage>(res);
      } catch (error) {
        console.log(new Date(), error);
        try {
          const res = await fetch(callback, {
            method: "post",
            body: JSON.stringify({
              content: defaultMessage,
              flags: MessageFlags.Ephemeral,
            }),
          });
          return await handleFetchResponse<APIMessage>(res);
        } catch (error) {
          console.error(new Date(), error);
        }
      }
    }
  }

  async editMessage(
    request: DiscordActionRequest<APIChatInputApplicationCommandInteraction>,
    message: RESTPatchAPIWebhookWithTokenMessageJSONBody,
    messageId = "@original"
  ) {
    const callback = request.actionContext?.callbackUrl;
    if (callback) {
      const res = await fetch(
        callback + `/messages/${encodeURIComponent(messageId)}`,
        {
          method: "patch",
          body: JSON.stringify(message),
        }
      );
      return await handleFetchResponse<APIMessage>(res);
    }
  }

  async deleteMessage(
    request: DiscordActionRequest<APIChatInputApplicationCommandInteraction>,
    messageId = "@original"
  ) {
    const callback = request.actionContext?.callbackUrl;
    if (callback) {
      const res = await fetch(
        callback + `/messages/${encodeURIComponent(messageId)}`,
        {
          method: "delete",
        }
      );
      await handleFetchResponse(res);
    }
  }
}
