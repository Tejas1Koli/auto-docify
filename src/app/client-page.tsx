
"use client";

import type { GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import type { ExportToGitBookOutput } from '@/ai/flows/export-to-gitbook-flow';
import { handleGenerateDocs, handleRegenerateSection, handleExportToGitBook } from '@/lib/actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { Rocket, UploadCloud, Link as LinkIcon, Wand2, FileCode2, BookUser, MessagesSquare, FileDown, GitBranch, RefreshCcw, Edit3, FileType2, Image as ImageIcon, Download } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  inputType: z.enum(["url", "file"], { required_error: "Please select an input type" }),
  githubUrl: z.string().optional(),
  codeFile: z.any().optional(),
  uiOnlyMode: z.boolean().default(false),
  uiDescription: z.string().optional(),
}).refine(data => {
  if (data.uiOnlyMode) {
    return !!data.uiDescription && data.uiDescription.trim() !== "";
  }
  // If not uiOnlyMode, then either URL or File must be provided based on inputType
  if (data.inputType === "url") return !!data.githubUrl && data.githubUrl.trim() !== "";
  if (data.inputType === "file") return !!data.codeFile && data.codeFile[0]; // Check if file is present
  return false; // Fallback, should be caught by specific checks
}, {
  message: "Input is required. For UI-Only mode, provide a UI description. For code mode, provide a GitHub URL or .zip file.",
  path: ["uiDescription"], // Specific path helps focus error message
}).refine(data => data.uiOnlyMode || (data.inputType === "url" ? !!data.githubUrl && data.githubUrl.trim() !== "" : true), {
  message: "GitHub URL is required when input type is URL and not in UI-Only mode.",
  path: ["githubUrl"],
}).refine(data => data.uiOnlyMode || (data.inputType === "file" ? !!data.codeFile && data.codeFile[0] : true), {
  message: "A .zip file is required when input type is file and not in UI-Only mode.",
  path: ["codeFile"],
});

type FormValues = z.infer<typeof formSchema>;

const regenerationSchema = z.object({
  sectionName: z.string({ required_error: "Please select a section." }),
  tone: z.string({ required_error: "Please select a tone." }),
});
type RegenerationFormValues = z.infer<typeof regenerationSchema>;


const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-content p-4 rounded-md bg-card prose prose-sm max-w-none dark:prose-invert" data-ai-hint="markdown rendered content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || "No content available."}
      </ReactMarkdown>
    </div>
  );
};


export default function AutoDocifyClientPage() {
  const [isGenerating, startGenerationTransition] = useTransition();
  const [isRegenerating, startRegenerationTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  const [docs, setDocs] = useState<GenerateDocumentationOutput | null>(null);
  const [currentCodebaseInputForRegen, setCurrentCodebaseInputForRegen] = useState<string>('');
  const [currentUiOnlyModeForRegen, setCurrentUiOnlyModeForRegen] = useState<boolean>(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<{ name: keyof GenerateDocumentationOutput, content: string } | null>(null);
  const [tempEditedContent, setTempEditedContent] = useState<string>("");
  const [currentExportType, setCurrentExportType] = useState<'pdf' | 'notion' | 'gitbook' | null>(null);

  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputType: "url",
      githubUrl: "",
      uiOnlyMode: false,
      uiDescription: "",
    },
  });

  const regenerationForm = useForm<RegenerationFormValues>({
    resolver: zodResolver(regenerationSchema),
  });

  const handleEditSection = (sectionName: keyof GenerateDocumentationOutput, currentContent: string) => {
    setEditingSection({ name: sectionName, content: currentContent });
    setTempEditedContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (editingSection && docs) {
      const updatedDocs = { ...docs, [editingSection.name]: tempEditedContent };
      setDocs(updatedDocs as GenerateDocumentationOutput);
      setEditingSection(null);
      toast({ title: "Section Updated", description: `${editingSection.name} has been updated locally.` });
    }
  };

  const onSubmit = async (values: FormValues) => {
    let generationInputString = "";

    if (values.uiOnlyMode) {
        generationInputString = values.uiDescription || "";
         if (!generationInputString) {
            form.setError("uiDescription", { type: "manual", message: "UI description or Figma link is required for UI-Only mode." });
            return;
        }
    } else {
        if (values.inputType === "url" && values.githubUrl) {
            generationInputString = values.githubUrl;
        } else if (values.inputType === "file" && values.codeFile && values.codeFile[0]) {
            const file = values.codeFile[0];
            if (file.type !== "application/zip" && !file.name.endsWith('.zip')) {
                form.setError("codeFile", { type: "manual", message: "Please upload a .zip file for codebase analysis." });
                return;
            }
            try {
                generationInputString = await readFileAsDataURL(file);
            } catch (error) {
                toast({ title: "File Read Error", description: "Could not read the uploaded file.", variant: "destructive" });
                return;
            }
        } else {
            // This block should ideally not be reached if zod refinement is correct
            toast({ title: "Input Error", description: "Please provide the necessary input for documentation.", variant: "destructive" });
            return;
        }
    }

    setCurrentCodebaseInputForRegen(generationInputString);
    setCurrentUiOnlyModeForRegen(values.uiOnlyMode);
    setDocs(null);

    startGenerationTransition(async () => {
      try {
        const result = await handleGenerateDocs(generationInputString, values.uiOnlyMode);
        if (result.error) {
          toast({ title: "Generation Failed", description: result.error, variant: "destructive" });
        } else if (result.data) {
          setDocs(result.data);
          toast({ title: "Documentation Generated!", description: "Your docs are ready to view." });
        }
      } catch (error) {
        toast({ title: "Unexpected Error", description: "An error occurred during generation.", variant: "destructive" });
      }
    });
  };

  const onRegenerateSubmit = async (values: RegenerationFormValues) => {
    if (!currentCodebaseInputForRegen) {
      toast({ title: "Error", description: "No codebase context found for regeneration.", variant: "destructive" });
      return;
    }
    if (!docs) { // Should not happen if regenerate button is only visible with docs
         toast({ title: "Error", description: "No existing documentation to regenerate from.", variant: "destructive" });
         return;
    }

    startRegenerationTransition(async () => {
      try {
        const result = await handleRegenerateSection(
          currentCodebaseInputForRegen,
          values.sectionName,
          values.tone,
          currentUiOnlyModeForRegen // Pass UI mode context
        );
        if (result.error) {
          toast({ title: "Regeneration Failed", description: result.error, variant: "destructive" });
        } else if (result.data) {
          setDocs(prevDocs => ({
            ...prevDocs!,
            [values.sectionName as keyof GenerateDocumentationOutput]: result.data!.regeneratedContent,
          }));
          toast({ title: "Section Regenerated!", description: `${values.sectionName} has been updated.` });
          setShowRegenerateDialog(false);
          regenerationForm.reset();
        }
      } catch (error) {
        toast({ title: "Unexpected Error", description: "An error occurred during regeneration.", variant: "destructive" });
      }
    });
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerExport = async (exportType: 'pdf' | 'notion' | 'gitbook') => {
    if (exportType === 'pdf') {
      toast({ title: "PDF Export (Coming Soon!)", description: "Full PDF export functionality is under development."});
      return;
    }
    if (exportType === 'notion') {
      toast({ title: "Notion Export (Coming Soon!)", description: "Full Notion export functionality is under development."});
      return;
    }

    // Only GitBook export will proceed from here
    if (!docs) {
      toast({ title: "No Docs", description: "Please generate documentation first to export to GitBook.", variant: "destructive" });
      return;
    }

    setCurrentExportType('gitbook');
    startExportTransition(async () => {
      let result;
      try {
        result = await handleExportToGitBook(docs!); // docs cannot be null here due to the check above
        if (result?.data?.content && result.data.fileName && result.data.mimeType) {
          const { fileName, mimeType, content } = result.data;
          const link = document.createElement('a');
          link.href = `data:${mimeType};base64,${content}`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "GitBook Export Ready", description: `Downloaded ${fileName}. You can now import it into GitBook.` });
        } else if (result?.error) {
          toast({ title: `GitBook Export Failed`, description: result.error, variant: "destructive" });
        } else if (result?.message) { // To handle messages from the flow
           toast({ title: `GitBook Export Status`, description: result.message });
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ title: "Export Error", description: `An unexpected error occurred during GitBook export: ${errorMessage}`, variant: "destructive" });
      } finally {
        setCurrentExportType(null);
      }
    });
  };

  const docSectionsConfig = (uiMode: boolean): Array<{ id: keyof GenerateDocumentationOutput; title: string; icon: React.ElementType }> => {
    if (uiMode) {
      return [
        { id: 'readme', title: 'UI Overview', icon: FileCode2 },
        { id: 'apiDocs', title: 'Key Screens/Components', icon: GitBranch },
        { id: 'userManual', title: 'User Flow Ideas', icon: BookUser },
        { id: 'faq', title: 'UI FAQ', icon: MessagesSquare },
      ];
    }
    return [
      { id: 'readme', title: 'README.md', icon: FileCode2 },
      { id: 'apiDocs', title: 'API Docs', icon: GitBranch },
      { id: 'userManual', title: 'User Manual', icon: BookUser },
      { id: 'faq', title: 'Code FAQ', icon: MessagesSquare },
    ];
  };
  const currentDocSections = docSectionsConfig(currentUiOnlyModeForRegen);

  console.log("Preparing to render AutoDocifyClientPage component layout.");

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Rocket className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold text-primary">AutoDocify</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Docs from code/UI. Instantly.
        </p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <CardDescription>Provide codebase (URL/zip) OR UI description/Figma link for documentation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="uiOnlyMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        <ImageIcon className="inline-block mr-2 h-5 w-5 text-primary" />
                        UI-Focused Documentation
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enable to generate docs from a UI description or Figma/design tool link.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("uiOnlyMode") ? (
                <FormField
                  control={form.control}
                  name="uiDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UI Description or Figma/Design Link</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your UI, its components, user flows, or paste a Figma/design tool link here..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The AI will use this to generate UI-focused documentation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="inputType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Input Method for Codebase</FormLabel>
                      <FormControl>
                        <Tabs defaultValue="url" onValueChange={(value) => field.onChange(value as "url" | "file")} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4" />GitHub URL</TabsTrigger>
                            <TabsTrigger value="file"><UploadCloud className="mr-2 h-4 w-4" />Upload .zip</TabsTrigger>
                          </TabsList>
                          <TabsContent value="url" className="pt-4">
                            <FormField
                              control={form.control}
                              name="githubUrl"
                              render={({ field: urlField }) => (
                                <FormItem>
                                  <FormLabel>GitHub Repository URL</FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://github.com/user/repo" {...urlField} disabled={form.getValues("inputType") !== "url"} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          <TabsContent value="file" className="pt-4">
                            <FormField
                              control={form.control}
                              name="codeFile"
                              render={({ field: fileField }) => (
                                <FormItem>
                                  <FormLabel>Upload .zip File</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept=".zip"
                                      onChange={(e) => fileField.onChange(e.target.files)}
                                      disabled={form.getValues("inputType") !== "file"}
                                      className="file:text-primary file:font-semibold file:bg-primary/10 hover:file:bg-primary/20"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">✅ What documentation will be generated?</h3>
                <ul className="space-y-1 text-muted-foreground list-inside">
                  {form.watch("uiOnlyMode") ? (
                    <>
                      <li className="flex items-center"><FileCode2 className="w-5 h-5 mr-2 text-primary" />UI Overview</li>
                      <li className="flex items-center"><GitBranch className="w-5 h-5 mr-2 text-primary" />Key Screens/Components</li>
                      <li className="flex items-center"><BookUser className="w-5 h-5 mr-2 text-primary" />User Flow Ideas</li>
                      <li className="flex items-center"><MessagesSquare className="w-5 h-5 mr-2 text-primary" />UI-Focused FAQ</li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center"><FileCode2 className="w-5 h-5 mr-2 text-primary" />README.md</li>
                      <li className="flex items-center"><GitBranch className="w-5 h-5 mr-2 text-primary" />API Docs</li>
                      <li className="flex items-center"><BookUser className="w-5 h-5 mr-2 text-primary" />User Manual</li>
                      <li className="flex items-center"><MessagesSquare className="w-5 h-5 mr-2 text-primary" />Code FAQ</li>
                    </>
                  )}
                </ul>
              </div>

              <Button type="submit" className="w-full text-lg py-6" disabled={isGenerating || isRegenerating || isExporting}>
                <Wand2 className="mr-2 h-5 w-5" />
                {isGenerating ? "Generating..." : "Generate Docs 🔥"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isGenerating || isRegenerating || isExporting) && (
        <div className="text-center py-10">
          <div role="status" className="flex flex-col items-center">
              <svg aria-hidden="true" className="w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <p className="mt-4 text-lg text-muted-foreground">
                {isGenerating ? "Generating documentation..." : isRegenerating ? "Regenerating section..." : isExporting && currentExportType === 'gitbook' ? "Generating GitBook Zip..." : "Processing..."}
                This might take a moment.
              </p>
              <p className="text-sm text-muted-foreground">Please don't close this page.</p>
          </div>
        </div>
      )}

      {docs && !isGenerating && !isRegenerating && !isExporting && (
        <Card className="shadow-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Generated Documentation</CardTitle>
            <CardDescription>Review, edit, and export your new docs. {currentUiOnlyModeForRegen ? "(UI-Focused Mode)" : "(Code-Focused Mode)"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="readme" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                {currentDocSections.map(section => (
                  <TabsTrigger key={section.id} value={section.id}>
                    <section.icon className="mr-2 h-4 w-4" />{section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {currentDocSections.map(section => (
                <TabsContent key={section.id} value={section.id} className="mt-4 relative">
                  {editingSection?.name === section.id ? (
                    <div className="space-y-4 p-4 border rounded-md">
                      <Label htmlFor={`edit-${section.id}`} className="text-lg font-semibold">Editing {section.title}</Label>
                      <Textarea
                        id={`edit-${section.id}`}
                        value={tempEditedContent}
                        onChange={(e) => setTempEditedContent(e.target.value)}
                        rows={15}
                        className="w-full font-mono text-sm"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 m-1"
                        onClick={() => handleEditSection(section.id, docs[section.id])}
                      >
                        <Edit3 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <MarkdownViewer content={docs[section.id]} />
                       <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => handleDownloadMarkdown(docs[section.id], `${section.id}.md`)}
                      >
                        <FileType2 className="h-4 w-4 mr-2" /> Download {section.title}
                      </Button>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
            <TooltipProvider>
              <Card className="mt-8 bg-secondary/50">
                <CardHeader>
                  <CardTitle>Actions & Exports</CardTitle>
                  <CardDescription>Export your documentation to various platforms or download as individual files.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => triggerExport('pdf')} disabled={true}>
                        <FileDown className="mr-2 h-4 w-4" />Download PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export documentation as a PDF file. (Coming soon!)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => triggerExport('notion')} disabled={true}>
                        <Image src="https://placehold.co/16x16.png" alt="Notion Logo" width={16} height={16} className="mr-2" data-ai-hint="Notion logo"/>
                        Export to Notion
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send your documentation to Notion. (Coming soon!)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="outline" onClick={() => triggerExport('gitbook')} disabled={isExporting || isGenerating || isRegenerating}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting && currentExportType === 'gitbook' ? "Generating Zip..." : "Download GitBook .zip"}
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download a .zip file with markdown docs, ready for GitBook import.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                    <DialogTrigger asChild>
                      <Button disabled={isGenerating || isRegenerating || isExporting}><RefreshCcw className="mr-2 h-4 w-4" />Regenerate Section</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Regenerate Documentation Section</DialogTitle>
                        <DialogDescription>
                          Choose a section and tone to regenerate with AI. Context from the last generation will be used.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...regenerationForm}>
                        <form onSubmit={regenerationForm.handleSubmit(onRegenerateSubmit)} className="space-y-4">
                          <FormField
                            control={regenerationForm.control}
                            name="sectionName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Section to Regenerate</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a section" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {currentDocSections.map(s => (
                                       <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={regenerationForm.control}
                            name="tone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tone</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a tone" />
                                    </Trigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="developer-friendly">Developer-Friendly</SelectItem>
                                    <SelectItem value="business-friendly">Business-Friendly</SelectItem>
                                    <SelectItem value="formal">Formal</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="ui-focused">UI/UX Focused</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowRegenerateDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={isRegenerating || isGenerating || isExporting}>
                              {isRegenerating ? "Regenerating..." : "Regenerate"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    