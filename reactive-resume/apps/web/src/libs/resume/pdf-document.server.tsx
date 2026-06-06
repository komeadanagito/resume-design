import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { renderToBuffer } from "@react-pdf/renderer";
import { createLocalizedResumeDocument } from "./pdf-document";

export const createResumePdfFile = async (data: ResumeData, filename: string, template?: Template) => {
	const document = await createLocalizedResumeDocument(data, template);
	const buffer = await renderToBuffer(document);
	const bytes = new Uint8Array(new ArrayBuffer(buffer.byteLength));
	bytes.set(buffer);

	return new File([bytes], filename, { type: "application/pdf" });
};
