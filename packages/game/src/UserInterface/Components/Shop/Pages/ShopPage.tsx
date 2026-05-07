import ShopDefaultPage from "./ShopDefaultPage";
import ShopFeaturesPage from "./ShopFeaturesPage";
import ShopTrophiesPage from "./ShopTrophiesPage";
import ShopBotsPage from "./ShopBotsPage";
import { ShopPageData } from "@pixel63/events";
import ShopPetsPage from "./ShopPetsPage";
import ShopBundlePage from "@UserInterface/Components/Shop/Pages/ShopBundlePage";
import ShopHabboClubPage from "@UserInterface/Components/Shop/Pages/ShopHabboClubPage";

export type ShopPageProps = {
    editMode?: boolean;
    search: string;
    page: ShopPageData;
    setActiveShopPage?: (page: { id: string; category: string; }) => void;
    
    requestedFurnitureId?: string;
}

export default function ShopPage({ search, editMode, page, setActiveShopPage, requestedFurnitureId }: ShopPageProps) {
    switch(page.type) {
        case "default":
            return (<ShopDefaultPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);

        case "bundle":
            return (<ShopBundlePage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);
            
        case "trophies":
            return (<ShopTrophiesPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);
            
        case "bots":
            return (<ShopBotsPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);
            
        case "pets":
            return (<ShopPetsPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);

        case "features":
            return (<ShopFeaturesPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId} setActiveShopPage={setActiveShopPage}/>);
            
        case "habboclub":
            return (<ShopHabboClubPage key={page.id} search={search} editMode={editMode} page={page} requestedFurnitureId={requestedFurnitureId}/>);
        
        default:
            return <div/>;
    }
}
