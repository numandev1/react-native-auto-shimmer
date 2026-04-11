import { DevToolsPluginClient } from '@rozenite/plugin-bridge';
export interface SkeletonPiece {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number | string;
    c?: boolean;
}
export declare const PLUGIN_ID = "react-native-auto-shimmer";
export interface PluginEvents {
    'capture-request': {
        name: string;
    };
    'capture-result': {
        name: string;
        viewportWidth: number;
        height: number;
        skeletons: SkeletonPiece[];
        labels: string[];
        error?: string;
    };
    'capture-all-request': Record<string, never>;
    'capture-all-result': {
        results: Array<{
            name: string;
            ok: boolean;
            skeletonCount: number;
            error?: string;
        }>;
    };
    'registered-components': {
        names: string[];
        driftMap: Record<string, boolean>;
    };
    'skeleton-drift': {
        name: string;
        viewportWidth: number;
        diffCount: number;
        threshold: number;
    };
    'save-request': {
        name: string;
        outDir: string;
        /** All captured breakpoints — keyed by viewport width in dp */
        allBreakpoints: Record<number, {
            viewportWidth: number;
            height: number;
            skeletons: SkeletonPiece[];
        }>;
    };
    'save-result': {
        ok: boolean;
        file?: string;
        skeletons?: number;
        breakpointCount?: number;
        error?: string;
    };
    'save-descriptor-request': {
        name: string;
        outDir: string;
        /** All captured breakpoints — keyed by viewport width in dp */
        allBreakpoints: Record<number, {
            viewportWidth: number;
            height: number;
            skeletons: SkeletonPiece[];
        }>;
    };
    'save-descriptor-result': {
        ok: boolean;
        file?: string;
        breakpointCount?: number;
        error?: string;
    };
}
export default function setupPlugin(client: DevToolsPluginClient<PluginEvents>): () => void;
