export declare class UploadOCRMiddleware {
    private upload;
    constructor();
    private configurarMulter;
    subirComprobante(): (req: any, res: any, next: any) => void;
    limpiarArchivosTemporales(): (req: any, res: any, next: any) => Promise<void>;
    static limpiarArchivosAntiguos(): Promise<void>;
}
//# sourceMappingURL=uploadOCR.d.ts.map