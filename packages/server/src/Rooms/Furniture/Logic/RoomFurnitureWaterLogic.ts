import { UseRoomFurnitureData } from "@pixel63/events";
import RoomUser from "../../Users/RoomUser.js";
import RoomFurniture from "../RoomFurniture.js";
import RoomFurnitureLogic from "./Interfaces/RoomFurnitureLogic.js";

export default class RoomFurnitureWaterLogic implements RoomFurnitureLogic {
    private roomUsersSplashing: RoomUser[] = [];

    constructor(private readonly roomFurniture: RoomFurniture) {

    }

    async handleBeforeUserWalksOn(roomUser: RoomUser): Promise<void> {
        if(roomUser.hasAction("AvatarEffect.29")) {
            return;
        }

        roomUser.addAction("AvatarEffect.28");
        this.roomUsersSplashing.push(roomUser);
    }

    async handleBeforeUserWalksOff(roomUser: RoomUser, newRoomFurniture: RoomFurniture[]): Promise<void> {
        if(!newRoomFurniture.some((furniture) => (furniture.logic instanceof RoomFurnitureWaterLogic))) {
            roomUser.removeAction("AvatarEffect");
        }
    }

    async use(roomUser: RoomUser, payload: UseRoomFurnitureData): Promise<void> {

    }

    async handleActionsInterval(): Promise<void> {
        for(const roomUser of this.roomUsersSplashing) {
            roomUser.removeAction("AvatarEffect");
            roomUser.addAction("AvatarEffect.29");
        }

        this.roomUsersSplashing = [];
    }
}
