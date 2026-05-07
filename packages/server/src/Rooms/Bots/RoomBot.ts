import Room from "../Room.js";
import { UserBotModel } from "../../Database/Models/Users/Bots/UserBotModel.js";
import { game } from "../../index.js";
import RoomActor from "../Actor/RoomActor.js";
import RoomActorPath from "../Actor/Path/RoomActorPath.js";
import { RoomActorActionData, RoomActorChatData, RoomActorPositionData, RoomActorWalkToData, RoomBotsData, RoomPositionData, RoomPositionOffsetData, UserBotData } from "@pixel63/events";
import RoomUser from "../Users/RoomUser.js";
import Directions from "../../Helpers/Directions.js";
import { RoomActorAction } from "../Actor/RoomActorAction.js";

export default class RoomBot implements RoomActor {
    public preoccupiedByActionHandler: boolean = false;

    public actions: RoomActorAction[] = [];
    public position: RoomPositionData;
    public direction: number;

    public path: RoomActorPath;

    public lastActivity: number = 0;

    constructor(public readonly room: Room, public readonly model: UserBotModel) {
        this.position = model.position;
        this.direction = model.direction;

        this.path = new RoomActorPath(this);

        const sitableFurniture = room.getSitableFurnitureAtPosition(RoomPositionOffsetData.fromJSON(model.position));

        if (sitableFurniture) {
          this.actions.push({
            id: "Sit",
            expiresAt: undefined
          });
        }
    }

    public getRoomBotData(): UserBotData {
        return {
            $type: "UserBotData",

            id: this.model.id,
            userId: this.model.userId,
            type: this.model.type,
            name: this.model.name,
            motto: this.model.motto ?? undefined,

            figureConfiguration: this.model.figureConfiguration,

            position: this.position,
            direction: this.direction,
            relaxed: this.model.relaxed,

            actions: this.actions.map((action) => action.id)
        };
    }

    public static async place(room: Room, userBot: UserBotModel, position: RoomPositionData, direction: number) {
        await userBot.update({
            position,
            direction,
            roomId: room.model.id
        });

        const roomBot = new RoomBot(room, userBot);

        const sitableFurniture = room.getSitableFurnitureAtPosition(RoomPositionOffsetData.fromJSON(position));

        if (sitableFurniture) {
          roomBot.addAction("Sit", undefined, false);
        }

        room.bots.push(roomBot);

        room.floorplan.updatePosition(RoomPositionOffsetData.fromJSON(position));

        room.sendProtobuff(RoomBotsData, RoomBotsData.fromJSON({
            botsAdded: [
                roomBot.getRoomBotData()
            ]
        }));


        if (sitableFurniture)
        {
          room.refreshActorsSitting(RoomPositionOffsetData.fromJSON(position), sitableFurniture?.getDimensions());
        }

        return roomBot;
    }

    public hasAction(actionId: string): boolean {
        return this.actions.some((action) => action.id === actionId);
    }

    public addAction(action: string, removeAfterMs?: number, sendProtobuff: boolean = true): RoomActorActionData | null {
        if(this.hasAction(action)) {
            return null;
        }

        if(action === "Sit") {
            if(this.direction % 2) {
                this.path.setDirection((this.direction + 1) % 8);
            }
        }

        if(["Wave", "GestureSmile", "GestureSad", "GestureAngry", "GestureSurprised", "Laugh"].includes(action)) {
            removeAfterMs = 2000;
        }

        this.actions.push({
            id: action,
            expiresAt: (removeAfterMs !== undefined)?(performance.now() + removeAfterMs):(undefined)
        });

        const roomActorActionData = RoomActorActionData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },

            actionsAdded: [action]
        });

        if(sendProtobuff) {
            this.room.sendProtobuff(RoomActorActionData, roomActorActionData);
        }

        return roomActorActionData;
    }

    public removeAction(action: string) {
        const actionId = action.split('.')[0]!;

        const existingActionIndex = this.actions.findIndex((action) => action.id.split('.')[0] === actionId);

        if(existingActionIndex === -1) {
            return;
        }

        this.actions.splice(existingActionIndex, 1);

        this.room.sendProtobuff(RoomActorActionData, RoomActorActionData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },

            actionsRemoved: [actionId]
        }));
    }

    public sendWalkEvent(previousPosition: RoomPositionData): void {
        this.model.position = this.position;
        this.model.direction = this.direction;

        this.room.sendProtobuff(RoomActorWalkToData, RoomActorWalkToData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },
            from: previousPosition,
            to: this.position,
            direction: this.direction
        }));
    }

    public sendDirectionEvent(): void {
        this.model.direction = this.direction;

        this.room.sendProtobuff(RoomActorPositionData, RoomActorPositionData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },

            direction: this.direction,
        }));
    }

    public sendPositionEvent(usePath: boolean, roomActorActionsData?: RoomActorActionData | null) {
        this.model.position = this.position;
        this.model.direction = this.direction;

        this.room.sendProtobuff(RoomActorPositionData, RoomActorPositionData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },

            position: this.position,
            direction: this.direction,
            usePath,

            action: roomActorActionsData ?? undefined
        }));
    }

    public async pickup() {
        this.room.bots.splice(this.room.bots.indexOf(this), 1);

        this.room.floorplan.updatePosition(RoomPositionOffsetData.fromJSON(this.model.position));

        this.room.sendProtobuff(RoomBotsData, RoomBotsData.fromJSON({
            botsRemoved: [
                this.getRoomBotData()
            ]
        }));

        await this.model.update({
            roomId: null
        });

        const user = game.getUserById(this.model.user.id);

        if(user) {
            await user.getInventory().addBot(this.model);
        }
    }

    public async setPosition(position: RoomPositionData, save: boolean = true) {
        const previousPosition = this.model.position;

        this.position = position;

        this.room.floorplan.updatePosition(RoomPositionOffsetData.fromJSON(previousPosition));
        this.room.floorplan.updatePosition(RoomPositionOffsetData.fromJSON(position));

        if(save && this.model.changed()) {
            await this.model.save();

            this.room.sendProtobuff(RoomBotsData, RoomBotsData.fromJSON({
                botsUpdated: [
                    this.getRoomBotData()
                ]
            }));
        }
    }

    private lastChatMessage: number = 0;
    private lastChatMessageIndex: number | null = null;

    public async handleActionsInterval() {
        if(this.model.speech.automaticChat) {
            await this.handleAutomaticChat();
        }

        if(this.followingUsers.length) {
            this.handleFollowingUsers();
        }
        else if(this.model.relaxed) {
            await this.handleRelaxed();
        }

        await this.path.handleActionsInterval();
    }

    public async handleAutomaticChat() {
        if(!this.model.speech.automaticChat) {
            return;
        }

        const elapsedSinceLastChatMessage = performance.now() - this.lastChatMessage;

        if(elapsedSinceLastChatMessage < this.model.speech.automaticChatDelay * 1000) {
            return;
        }

        let message: string | null = null;

        if(this.model.speech.randomizeMessages) {
            message = this.model.speech.messages[Math.floor(Math.random() * this.model.speech.messages.length)] ?? null;
        }
        else {
            let index: number;

            if(this.lastChatMessageIndex === null) {
                index = 0;
            }
            else {
                index = this.lastChatMessageIndex + 1;

                if(index >= this.model.speech.messages.length) {
                    index = 0;
                }
            }

            message = this.model.speech.messages[index] ?? null;

            this.lastChatMessageIndex = index;
        }

        this.lastChatMessage = performance.now();

        if(!message) {
            return;
        }

        this.room.sendProtobuff(RoomActorChatData, RoomActorChatData.create({
            actor: {
                bot: {
                    botId: this.model.id
                }
            },

            message,
            roomChatStyleId: "bot_guide"
        }));
    }

    private lastMovement: number = 0;

    public async handleRelaxed() {
        const elapsedSinceLastMovement = performance.now() - this.lastMovement;

        if(elapsedSinceLastMovement < 5 * 1000) {
            return;
        }

        if(this.path.path) {
            return;
        }

        this.lastMovement = performance.now();

        const targetPosition = RoomPositionOffsetData.create({
            row: this.model.position.row + Math.floor(Math.random() * 7) - 3,
            column: this.model.position.column + Math.floor(Math.random() * 7) - 3,
        });

        if(this.room.model.structure.door?.row === targetPosition.row && this.room.model.structure.door?.column === targetPosition.column) {
            return;
        }

        this.path.walkTo(targetPosition);
    }

    private followingUsers: RoomUser[] = [];

    public setFollowingUser(roomUser: RoomUser) {
        if(this.followingUsers.includes(roomUser)) {
            return;
        }

        this.followingUsers.push(roomUser);
    }

    public stopFollowingUser(roomUser: RoomUser) {
        const index = this.followingUsers.indexOf(roomUser);

        if(index === -1) {
            return;
        }

        this.followingUsers.splice(index, 1);
    }

    private handleFollowingUsers() {
        const userToFollow = this.followingUsers[Math.floor(Math.random() * this.followingUsers.length)];

        if(!userToFollow) {
            return;
        }

        this.path.walkTo(RoomPositionOffsetData.fromJSON(userToFollow.position));
    }
}
