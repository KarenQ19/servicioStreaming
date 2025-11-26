export declare class OCRService {
    private worker;
    private static instance;
    private initialized;
    constructor();
    static getInstance(): OCRService;
    private inicializarWorker;
    procesarImagen(imagePath: string): Promise<any>;
    procesarBuffer(imageBuffer: Buffer): Promise<any>;
    private preprocesarImagen;
    private preprocesarBuffer;
    private ejecutarOCR;
    private extraerInformacion;
    private buscarMontosAdicionales;
    private limpiarValor;
    cerrarWorker(): Promise<void>;
}
//# sourceMappingURL=ocrService.d.ts.map