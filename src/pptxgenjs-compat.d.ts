declare module 'pptxgenjs' {
  class PptxGenJS {
    constructor();
    [key: string]: any;
    addSlide(): any;
    write(options?: any): Promise<any>;
  }
  export default PptxGenJS;
}
