import express from "express";
import {
    APIApplicationCommandInteractionDataSubcommandOption,
    APIApplicationCommandSubcommandOption,
    APIChatInputApplicationCommandInteraction,
    APIInteractionResponse,
    ApplicationCommandOptionType,
    ApplicationCommandSpec,
    ApplicationCommandType,
    DiscordActionMetadata,
    DiscordActionRequest,
    DiscordActionResponse,
    getSubCommandOption,
    getSubCommandOptionValue,
    InteractionResponseType,
    InteractionType,
    MessageFlags,
    RESTPostAPIWebhookWithTokenJSONBody,
} from "@collabland/discord";
// import { SignatureVerifier } from "../helpers/verify";
import {MiniAppManifest} from "@collabland/models";
import {DemoRequest} from "../helpers/demo-request";
import {FollowUp} from "../helpers";

const router = express.Router();

async function handle(
    interaction: DiscordActionRequest<APIChatInputApplicationCommandInteraction>
): Promise<DiscordActionResponse> {
    /**
     * Get the value of `your-name` argument for `/hello-action`
     */
        // 获取用户名(username)
    let username = interaction.member?.user?.username;
    if (username === undefined || username === null) {
        username = "";
    }
    // 尝试获取 子指令 (check/report)
    const option = getSubCommandOption(interaction);
    let responseMsg; //此处返回的是请求后端之后返回的消息，并在dicsord上显示
    let isDeferReply = true;
    try {
        if (option === undefined || option === null) {
            // 不是 一级指令  则 尝试获取 子指令组 (request)
            const optionGroup = getSubCommandOptionGroup(interaction);
            if (optionGroup === undefined || optionGroup === null) {
                isDeferReply = false;
                responseMsg = "Invalid command";
            } else {
                switch (optionGroup?.name) {
                    case "subCommandGroup": {
                        // 解析 子指令组(request) 下的 子指令
                        const subOption = getSubCommandOptionGroupSubCommand(optionGroup);
                        if (subOption === undefined || subOption === null) {
                            isDeferReply = false;
                            responseMsg = "Invalid command";
                            break;
                        }
                        console.log(
                            new Date(),
                            `handling interaction (option.name=${optionGroup?.name} ${subOption?.name})`
                        );
                        switch (subOption?.name) {
                            case "sub1": {
                                // 获取 子指令组(subCommandGroup) 下的 子指令(sub1) 的值
                                const auditDescription =
                                    getSubCommandOptionGroupSubCommandValue(
                                        optionGroup,
                                        "sub1",
                                        "description"
                                    );
                                if (!auditDescription) {
                                    isDeferReply = false;
                                    responseMsg = "Invalid description";
                                    break;
                                }
                                handleCommand(
                                    auditDescription,
                                    username,
                                    interaction
                                );
                                break;
                            }

                            case "sub2": {
                                // 获取 子指令组(subCommandGroup) 下的 子指令(sub2) 的值
                                const sub2Description =
                                    getSubCommandOptionGroupSubCommandValue(
                                        optionGroup,
                                        "sub2",
                                        "description"
                                    );
                                if (!sub2Description) {
                                    isDeferReply = false;
                                    responseMsg = "Invalid description";
                                    break;
                                }
                                handleCommand(
                                    sub2Description,
                                    username,
                                    interaction
                                );
                                break;
                            }

                            default: {
                                isDeferReply = false;
                                responseMsg = "Invalid command";
                                break;
                            }
                        }
                        break;
                    }

                    default: {
                        isDeferReply = false;
                        responseMsg = "Invalid command";
                        break;
                    }
                }
            }
        } else {
            console.log(
                new Date(),
                `handling interaction (option.name=${option?.name})`
            );
            switch (option?.name) {
                case "command1": {
                    // 获取 子指令(command1) 的值
                    const check = getSubCommandOptionValue(
                        interaction,
                        "command1",
                        "description"
                    );

                    if (!check) {
                        isDeferReply = false;
                        responseMsg = "Invalid description";
                        break;
                    }
                    handleCommand(check, '', interaction);
                    break;
                }

                default: {
                    isDeferReply = false;
                    responseMsg = "Invalid command";
                    break;
                }
            }
        }
    } catch (error) {
        console.error(new Date(), "error", error);
        isDeferReply = false;
        responseMsg = "server error, please retry later.";
    }

    /**
     * Build a simple Discord message private to the user
     */
    let response: APIInteractionResponse;
    if (isDeferReply) {
        response = {
            type: InteractionResponseType.DeferredChannelMessageWithSource,
            data: {
                flags: MessageFlags.Ephemeral
            }
        };
    } else {
        response = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: responseMsg,
                flags: MessageFlags.Ephemeral
            }
        };
    }
    return response;
}

/**
 * 解析子指令组
 * @param interaction
 * @returns
 */
function getSubCommandOptionGroup(
    interaction: APIChatInputApplicationCommandInteraction
) {
    const option = interaction.data.options?.find(
        (o) => o.type === ApplicationCommandOptionType.SubcommandGroup
    );
    return option as APIApplicationCommandSubcommandOption | undefined;
}

/**
 * 解析子指令组下的子指令
 * @param subCommandGroup
 * @returns
 */
function getSubCommandOptionGroupSubCommand(
    subCommandGroup: APIApplicationCommandSubcommandOption
) {
    const option = subCommandGroup.options?.find(
        (o) => o.type === ApplicationCommandOptionType.Subcommand.valueOf()
    );
    return option as
        | APIApplicationCommandInteractionDataSubcommandOption
        | undefined;
}

/**
 * 解析子指令组下的子指令的值
 * @param subCommandGroup
 * @param subCommandName
 * @param optionName
 * @returns
 */
function getSubCommandOptionGroupSubCommandValue<
    T extends string | number | boolean = string
>(
    subCommandGroup: APIApplicationCommandSubcommandOption,
    subCommandName: string,
    optionName: string
): T | undefined {
    const option = subCommandGroup.options?.find(
        (o) => o.name === subCommandName
    ) as APIApplicationCommandInteractionDataSubcommandOption | undefined;
    if (option == null) return undefined;
    const subOptions = option.options?.find((so) => so.name === optionName);
    if (subOptions == null) return undefined;
    switch (subOptions.type) {
        case ApplicationCommandOptionType.String:
            return subOptions.value as T;
        case ApplicationCommandOptionType.Boolean:
            return subOptions.value as T;
        case ApplicationCommandOptionType.Number:
        case ApplicationCommandOptionType.Integer:
            return subOptions.value as T;
        case ApplicationCommandOptionType.Mentionable:
        case ApplicationCommandOptionType.User:
        case ApplicationCommandOptionType.Role:
            return subOptions.value as T;
        case ApplicationCommandOptionType.Channel:
            return subOptions.value as T;
    }
}

/**
 * 处理指令
 * @param param
 * @param username
 * @param request
 */
async function handleCommand(
    param: string,
    username: string,
    request: DiscordActionRequest<APIChatInputApplicationCommandInteraction>
) {
    const demoRequest = new DemoRequest();
    const response = await demoRequest.request(param);

    const follow = new FollowUp();
    if (request.actionContext?.callbackUrl != null) {
        const responseMsg: RESTPostAPIWebhookWithTokenJSONBody = {
            content: `${response}`,
            flags: MessageFlags.Ephemeral
        };
        await follow.followupMessage(request, responseMsg);
    }
}

/**
 * 定义 mode-action 下的路由 (/metadata)
 * 用于获取 demo-action 的信息（应用指令、支持的指令等)
 */
router.get("/metadata", function (req, res) {
    const manifest = new MiniAppManifest({
        appId: "DemoBot",
        developer: "sober",
        name: "DemoBot",
        platforms: ["discord"],
        shortName: "DemoBot",
        version: {name: "1.0.0"},
        website: "https://prod.sober.com",
        description: "DemoBot is a demo app for Collab.Land.",
        shortDescription: "DemoBot is a demo app for Collab.Land.",
        thumbnails: [
            {
                label: "Member Directory",
                src: "https://xxx.png",
                sizes: "40x40"
            },
            {
                label: "Overview",
                src: "https://xxx.png",
                sizes: "40x40"
            }
        ],
        icons: [
            {
                label: "App icon",
                src: "https://xxx.png",
                sizes: "40x40"
            }
        ]
    });
    const metadata: DiscordActionMetadata = {
        /**
         * Miniapp manifest
         */
        manifest,
        /**
         * Supported Discord interactions. They allow Collab.Land to route Discord
         * interactions based on the type and name/custom-id.
         */
        supportedInteractions: [
            {
                type: InteractionType.ApplicationCommand,
                names: ["demoBot"]
            }
        ],
        /**
         * Supported Discord application commands. They will be registered to a
         * Discord guild upon installation.
         */
        applicationCommands: getApplicationCommands()
    };
    res.send(metadata);
});

/**
 * 定义 应用指令
 * @returns
 */
function getApplicationCommands(): ApplicationCommandSpec[] {
    const commands: ApplicationCommandSpec[] = [
        {
            metadata: {
                name: "DemoBot",
                shortName: "demoBot"
            },
            // 主指令 demoBot
            name: "demoBot",
            type: ApplicationCommandType.ChatInput,
            // description 最大长度100
            description: "/demoBot",
            options: [
                {
                    // 子指令 check
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "command1",
                    // description 最大长度100
                    description: "command1",
                    options: [
                        {
                            // 子指令 check 参数 address
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            name: "description",
                            // description 最大长度100
                            description: "description"
                        }
                    ]
                },
                {
                    // 子指令组 subCommandGroup
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    name: "subCommandGroup",
                    // description 最大长度100
                    description: "/demoBot subCommandGroup",
                    options: [
                        {
                            // 子指令组 subCommandGroup 的子指令 sub1
                            type: ApplicationCommandOptionType.Subcommand,
                            name: "sub1",
                            // description 最大长度100
                            description: "demoBot subCommandGroup sub1",
                            options: [
                                {
                                    // 子指令组 subCommandGroup 的子指令 sub1 参数 description
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                    name: "description",
                                    // description 最大长度100
                                    description: "demoBot subCommandGroup sub1"
                                }
                            ]
                        },
                        {
                            // 子指令组 subCommandGroup 的子指令 sub2
                            type: ApplicationCommandOptionType.Subcommand,
                            name: "sub2",
                            // description 最大长度100
                            description: "demoBot subCommandGroup sub2",
                            options: [
                                {
                                    // 子指令组 subCommandGroup 的子指令 sub2 参数 description
                                    type: ApplicationCommandOptionType.String,
                                    required: true,
                                    name: "description",
                                    // description 最大长度100
                                    description: "demoBot subCommandGroup sub1"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ];
    return commands;
}

/**
 * 定义 demo-action 下的路由 (/interactions)
 * 用于处理和用户的交互
 */
router.post("/interactions", async function (req, res) {
    // const verifier = new SignatureVerifier();
    // const verified = verifier.verify(req, res);
    // if (verified) {
    const result = await handle(req.body);
    try {
        res.send(result);
    } catch (error) {
        console.error(new Date(), error);
        res.send(result);
    }
    // } else {
    //   console.error(new Date(), "verify failed");
    // }
});

/**
 * 用于处理用户 install 和 uninstall miniApp
 */
router.post("/events", async function (req, res) {
    // const verifier = new SignatureVerifier();
    // const verified = verifier.verify(req, res);
    // if (verified) {
    //   // const result = await handle(req.body);
    //   // res.send(result);
    // } else {
    //   console.error(new Date(), "verify failed");
    // }
});

export default router;
