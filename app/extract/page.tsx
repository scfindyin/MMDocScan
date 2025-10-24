import { Metadata } from 'next';
import ExtractPageClient from './ExtractPageClient';

export const metadata: Metadata = {
  title: 'Batch Extraction - MMDocScan',
  description: 'Extract data from multiple documents with unified workflow',
};

export default function ExtractPage() {
  return <ExtractPageClient />;
}
