declare module 'pdf-poppler' {
  interface ConvertOptions {
    format?: string;
    out_dir?: string;
    out_prefix?: string;
    page?: number;
  }
  export function convert(file: string, opts: ConvertOptions): Promise<void>;
}
