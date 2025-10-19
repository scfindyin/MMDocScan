# Product Brief: MMDocScan

**Date:** 2025-10-18
**Author:** Steve
**Status:** Draft for PM Review

---

## Executive Summary

**MMDocScan** is an AI-powered document extraction tool that converts unstructured billing documents (invoices, equipment logs, timesheets, consumable logs) into accurate tabular data for project billing validation. Built on Anthropic's Claude Skills technology, the platform enables users to create reusable extraction templates with custom AI prompts, process both clean and scanned documents, and export structured data to Excel with full source traceability.

**Problem:** Manual extraction of billing data from vendor documents is error-prone, time-consuming, and lacks validation mechanisms to catch inaccuracies before they impact financial decisions. Current tools fail to provide the flexibility and accuracy needed for reliable billing validation across diverse document formats and quality levels.

**Solution:** Template-driven AI extraction with iterative refinement capabilities. Users define field structures and custom prompts, preview extraction results, adjust as needed, and export validated data with confidence scoring and source metadata. The system natively handles header-detail relationships critical to billing validation while adapting to variable document quality through intelligent AI processing.

**Target Users:** Small company employees handling back-office billing validation among multiple responsibilities. Users need practical, accurate tools that integrate with existing Excel-based workflows without steep learning curves.

**Key Value:** Eliminates manual data extraction errors and bottlenecks in billing validation workflows, improving cost visibility and reducing billing disputes through accuracy-focused automation.

---

## Problem Statement

**Current State:**
Project billing validation requires manual extraction of data from vendor invoices, equipment logs, timesheets, and consumable logs. Documents arrive in multiple formats (clean PDFs, Word docs, text files, and scanned images), requiring labor-intensive manual data entry to convert unstructured content into usable tabular data.

**Core Pain Points:**
- **Accuracy Risk**: Manual data extraction introduces errors that can compromise billing validation and project cost analysis
- **Unknown Inaccuracies**: No systematic way to detect or flag potential extraction errors before they impact billing decisions
- **Format Variability**: Mixed document quality (clean vs scanned) requires different handling approaches, increasing complexity
- **Inefficient Process**: Manual conversion creates bottlenecks in billing validation workflows

**Why Existing Solutions Fall Short:**
Available tools lack the flexibility and accuracy needed for reliable billing validation data extraction.

**Business Impact:**
Billing validation delays and accuracy concerns directly affect project profitability and client relationships. Efficiency gains are needed to scale operations.

---

## Proposed Solution

**Solution Overview:**
MMDocScan is an AI-powered document extraction tool that converts unstructured documents (invoices, logs, timesheets, consumable records) into accurate tabular data for billing validation. Users create reusable templates that define expected fields (job number, invoice date, ship to address, product SKU, UOM, amount, etc.), then apply those templates to process batches of similar documents.

**Core Approach:**
- **Template-First Design**: Users construct extraction templates specifying required fields and data structure expectations
- **AI-Powered Extraction**: Leverages Anthropic Claude Skills to intelligently extract data from both clean and scanned documents
- **Relational Data Handling**: Automatically maintains header-detail relationships (e.g., invoice header data repeated for each line item)
- **Reusable Templates**: Once created, templates can be applied to future documents of the same type

**Key Differentiators:**
- **Flexible Template System**: Supports any document type with tabular output needs, not limited to predefined document categories
- **AI Intelligence**: Claude Skills provides superior accuracy for both clean PDFs and scanned images
- **Header-Detail Architecture**: Native support for parent-child data relationships critical to billing validation
- **Accuracy-Focused Design**: Built specifically for financial validation where precision is paramount

**Value Proposition:**
Eliminates manual data extraction errors and bottlenecks in billing validation workflows through intelligent, template-driven automation that adapts to various document formats and quality levels.

---

## Target Users

### Primary User Segment

**Profile:**
Small company employees who handle back-office work including billing validation and project accounting among other responsibilities. These are generalist team members who pitch in where needed, not dedicated billing or data entry specialists.

**Current Workflow:**
- Split time between multiple business functions (project work, administrative tasks, billing support)
- Manually extract data from vendor documents when billing validation is needed
- Use Excel or similar tools for data organization and analysis
- Work with documents of varying quality and format

**Technical Proficiency:**
- Comfortable with standard business software (Excel, file management)
- Can follow clear instructions and workflows
- Need tools that are practical and intuitive - no time for steep learning curves
- Self-sufficient problem-solvers who adapt to various tasks

**Specific Pain Points:**
- Manual data entry takes time away from higher-value work
- Accuracy pressure when dealing with financial/billing data
- Frustration with inconsistent document formats requiring different handling approaches
- No good way to validate extraction accuracy before using data

**Success Goals:**
- Quickly produce accurate billing validation data
- Minimize time spent on repetitive document processing
- Maintain confidence in data accuracy for financial decisions
- Build reusable processes for recurring document types

### Secondary User Segment

Not applicable - single user profile for MVP scope.

---

## Goals and Success Metrics

### Business Objectives

1. **Maximum Extraction Accuracy**: Achieve the highest possible accuracy in data extraction to support reliable billing validation and financial decision-making
2. **Confidence Transparency**: System provides confidence scores and flags low-confidence extractions to alert users when manual review may be needed
3. **Business Impact**:
   - Reduced billing disputes through more accurate cost documentation
   - Improved cost visibility across projects

### User Success Metrics

Internal utility tool - adoption and usage metrics not tracked for MVP.

### Key Performance Indicators (KPIs)

**Primary Success Indicator:**
- AI extraction confidence levels and accuracy validation

**Secondary Indicators:**
- Reduction in billing disputes attributable to data accuracy
- Improved project cost visibility

---

## Strategic Alignment and Financial Impact

### Financial Impact

Internal utility tool - development cost justified by operational necessity for billing validation accuracy and efficiency.

### Company Objectives Alignment

Supports project profitability management and operational efficiency.

### Strategic Initiatives

Enables scalable billing validation processes.

---

## MVP Scope

### Core Features (Must Have)

**1. Template Management System**
- UI-based template builder for creating extraction templates
- Define field names, data types, and field categorization (header vs. detail)
- Save custom AI prompts/instructions with templates (e.g., formatting rules, example data)
- Template storage and retrieval
- Support for 5 template types: Invoices, Equipment Logs, Timesheets, Consumable Logs, and Generic Documents

**2. Document Processing Engine**
- File upload interface for PDFs, Word docs, and text files
- Support for both clean and scanned documents
- Claude Skills integration for AI-powered data extraction
- Apply selected template to uploaded documents
- Add/override custom prompts per extraction run (in addition to template defaults)
- Capture source document metadata (filename, page numbers, extraction timestamp)

**3. Intelligent Extraction**
- Header-detail relational extraction (parent-child data relationships)
- Confidence scoring for extracted data
- Flag low-confidence extractions for user review
- Handle variable document quality and formats
- Track source location for each extracted data point (page number, source file)

**4. Results Preview and Refinement**
- Preview extraction results before finalizing
- Adjust prompts/instructions and rerun extraction as needed
- Iterative refinement workflow until results are satisfactory

**5. Output Generation**
- Excel (.xlsx) file generation with extracted tabular data
- Header information repeated for each detail row
- Source document metadata included in output (filename, page number)
- Confidence indicators included in output

**6. Application Architecture**
- Web application
- Hybrid architecture: serverless where possible with client-side processing as needed
- Accessible via web browser

### Out of Scope for MVP

- Database output (Excel only for MVP; database integration planned for future phase)
- Template versioning and history tracking
- Advanced validation rules beyond confidence scoring
- User authentication and multi-user support
- Batch processing of multiple files simultaneously
- Template sharing or export/import functionality
- Advanced error handling and retry mechanisms
- Reporting and analytics dashboards

### MVP Success Criteria

**The MVP is successful when:**
1. User can create a template via UI for any of the 5 document types
2. Templates can include custom AI prompts/instructions with examples
3. User can upload a document and apply a template to extract data
4. User can add/modify prompts per extraction run for fine-tuning
5. User can preview extraction results and rerun with adjustments
6. System produces Excel output with accurate header-detail relationships
7. Source document metadata (filename, page numbers) is captured in output for traceability
8. Confidence scores alert users to potential extraction issues
9. Tool handles both clean and scanned documents with acceptable accuracy
10. Templates can be saved and reused for similar documents

---

## Post-MVP Vision

### Phase 2 Features

**Database Integration:**
- Direct export to database in addition to Excel
- Structured storage of extracted data for reporting and analysis

**Batch Processing:**
- Upload and process multiple files simultaneously
- Bulk template application

**Template Versioning:**
- Track template history and changes over time
- Restore previous template versions

**Advanced Validation:**
- Custom validation rules beyond confidence scoring
- Cross-field validation logic

**Multi-User Support:**
- User authentication and access control
- Multiple users working concurrently

### Long-term Vision

Evolution into a comprehensive document intelligence platform with potential for API integration, machine learning-enhanced extraction accuracy, and automated workflow capabilities.

### Expansion Opportunities

- Additional document types beyond initial 5 categories
- Integration with email systems for automated processing
- Potential application to other operational document workflows

---

## Technical Considerations

### Platform Requirements

**Browser and Device Support:**
- Modern browsers only (Chrome, Firefox, Safari, Edge - latest versions)
- Desktop and tablet support
- Mobile phone support not required

**Performance:**
- Initial focus on functionality over performance optimization
- Prompt caching for Claude API to reduce token usage (future optimization)
- Performance improvements deferred to post-MVP

**Accessibility:**
- Standard browser accessibility - no specific compliance requirements for MVP

### Technology Preferences

**Frontend:**
- React with Next.js framework
- ShadCN component library
- Tailwind CSS for styling
- TypeScript recommended

**Backend/Infrastructure:**
- Vercel for hosting and serverless functions
- Supabase for database (PostgreSQL)
- Python available for backend processing if needed

**AI Integration:**
- Direct Claude API integration
- Prompt caching strategy to optimize token usage

**File Handling:**
- Local file upload for MVP
- Future: SharePoint and other document sources

### Architecture Considerations

**Template Storage:**
- Templates stored in Supabase database
- Includes field definitions and custom AI prompts

**Document Processing:**
- Hybrid approach - client-side file handling, server-side Claude API calls
- Processing location optimized for performance and API usage

**Data Security:**
- Not a primary concern for MVP (internal tool)
- Standard HTTPS/secure transmission
- Future consideration for sensitive billing data

**Scalability:**
- Serverless architecture supports scaling as usage grows
- Database design accommodates future multi-user and batch processing

---

## Constraints and Assumptions

### Constraints

No significant constraints for MVP development.

### Key Assumptions

1. **AI Accuracy**: Claude Skills will provide sufficient accuracy for billing validation use cases
2. **User Resources**: Users will have example documents available to refine templates and prompts
3. **Output Format**: Excel output is adequate for integration with current billing validation workflows
4. **Scale**: Small company usage patterns - limited concurrent users, no enterprise-scale requirements
5. **Language**: Documents are in English (no multi-language support needed for MVP)
6. **Document Quality**: Mix of clean and scanned documents, with varying quality levels handled by AI extraction

---

## Appendices

### A. Research Summary

Not applicable - Product brief created from direct user collaboration without external research documents.

### B. Stakeholder Input

Not applicable - Initial brief developed with project owner.

### C. References

- Anthropic Claude Skills Documentation: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview

---

_This Product Brief serves as the foundational input for Product Requirements Document (PRD) creation._

_Next Steps: Handoff to Product Manager for PRD development using the `workflow prd` command._
