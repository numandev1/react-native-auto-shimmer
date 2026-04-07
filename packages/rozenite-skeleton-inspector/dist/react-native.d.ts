import { DevToolsPluginClient } from '@rozenite/plugin-bridge';
export declare const PLUGIN_ID = "react-native-auto-shimmer";
export interface Skeleton {
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
        skeletons: Skeleton[];
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
        skeletons: Skeleton[];
    };
    'save-result': {
        ok: boolean;
        file?: string;
        skeletons?: number;
        error?: string;
    };
}
export default function setupPlugin(client: DevToolsPluginClient<PluginEvents>): () => void;
