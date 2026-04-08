import { DevToolsPluginClient } from '@rozenite/plugin-bridge';
export declare const PLUGIN_ID = "react-native-auto-shimmer";
export interface SkeletonPiece {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number | string;
    c?: boolean;
}
export interface PluginEvents {
    'capture-request': {
        name: string;
    };
    'capture-result': {
        name: string;
        viewportWidth: number;
        height: number;
        skeletons: SkeletonPiece[];
        error?: string;
    };
    'registered-components': {
        names: string[];
    };
    'save-request': {
        name: string;
        outDir: string;
        viewportWidth: number;
        height: number;
        skeletons: SkeletonPiece[];
    };
    'save-result': {
        ok: boolean;
        file?: string;
        skeletons?: number;
        error?: string;
    };
    'save-descriptor-request': {
        name: string;
        outDir: string;
        viewportWidth: number;
        height: number;
        skeletons: SkeletonPiece[];
    };
    'save-descriptor-result': {
        ok: boolean;
        file?: string;
        error?: string;
    };
}
export default function setupPlugin(client: DevToolsPluginClient<PluginEvents>): () => void;
