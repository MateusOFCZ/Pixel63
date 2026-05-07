import { useEffect, useRef, useState } from "react";
import { webSocketClient } from "../../../../..";
import { GetShopPageBundleFurnitureData, GetShopPageFurnitureData, ShopFurnitureData, ShopPageFurnitureData } from "@pixel63/events";

export default function useShopPageFurniture(pageId: string, pageType?: string, search?: string) {
    const [shopFurnitures, setShopFurnitures] = useState<ShopFurnitureData[]>([]);

    const searchRequested = useRef<string | undefined>("");
    const shopFurnituresRequested = useRef<string>("");

    useEffect(() => {
        setShopFurnitures([]);

        const listener = webSocketClient.addProtobuffListener(ShopPageFurnitureData, {
            async handle(payload: ShopPageFurnitureData) {
                if(payload.pageId === pageId) {
                    setShopFurnitures(payload.furniture);
                }
            },
        })

        if(shopFurnituresRequested.current !== pageId || searchRequested.current !== search) {
            if(pageType === "bundle") {
                webSocketClient.sendProtobuff(GetShopPageBundleFurnitureData, GetShopPageBundleFurnitureData.create({
                    pageId
                }));
            }
            else {
                webSocketClient.sendProtobuff(GetShopPageFurnitureData, GetShopPageFurnitureData.create({
                    pageId,
                    search
                }));
            }

            shopFurnituresRequested.current = pageId;
            searchRequested.current = search;
        }

        return () => {
            webSocketClient.removeProtobuffListener(ShopPageFurnitureData, listener);
        };
    }, [pageId, search]);

    return shopFurnitures;
}
