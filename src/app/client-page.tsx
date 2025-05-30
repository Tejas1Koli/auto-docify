
"use client";

import type { GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import { handleExportToGitBook, handleGenerateDocs, handleRegenerateSection } from '@/lib/actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Edit3, FileCode2, FileText, GitBranch, Loader2, MessagesSquare, NotebookText, Rocket, Save, Send, BookUser, X } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-content p-4 rounded-md bg-card prose prose-sm max-w-none dark:prose-invert" data-ai-hint="markdown rendered content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || "No content available."}
      </ReactMarkdown>
    </div>
  );
};

const formSchema = z.object({
  inputMethod: z.enum(["url", "file", "text"]),
  codebaseInput: z.string().optional(), // URL or Text input
  codebaseFile: z.instanceof(File).optional(), // File input
  uiOnlyMode: z.boolean().default(false),
  uiDescription: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.uiOnlyMode) {
    if (!data.uiDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UI description or Figma link is required when UI-Only mode is enabled.",
        path: ["uiDescription"],
      });
    }
  } else {
    // Original logic for non-UI-Only mode
    if (data.inputMethod === "url" && (!data.codebaseInput || !data.codebaseInput.startsWith('https://github.com/'))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo).",
        path: ["codebaseInput"],
      });
    }
    if (data.inputMethod === "file" && !data.codebaseFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a .zip file for codebase input.",
        path: ["codebaseFile"],
      });
    }
    if (data.inputMethod === "file" && data.codebaseFile && data.codebaseFile.type !== "application/zip" && data.codebaseFile.type !== "application/x-zip-compressed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid file type. Please upload a .zip file.",
        path: ["codebaseFile"],
      });
    }
    if (data.inputMethod === "text" && (!data.codebaseInput || data.codebaseInput.trim().length < 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please paste a substantial code snippet (at least 50 characters).",
        path: ["codebaseInput"],
      });
    }
    if (data.inputMethod !== "text" && data.inputMethod !== "url" && data.inputMethod !== "file") {
        // This case should ideally not be reached if inputMethod enum is exhaustive
        // but as a fallback, ensure at least one input type has data if not uiOnlyMode
        if (!data.codebaseInput && !data.codebaseFile) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Codebase input (URL, file, or text) is required.",
                path: ["codebaseInput"], // Or a more general path
            });
        }
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const regenerationSchema = z.object({
  tone: z.string().min(1, "Please select a tone."),
  customPrompt: z.string().optional(),
});
type RegenerationFormValues = z.infer<typeof regenerationSchema>;


export default function AutoDocifyClientPage() {
  const [isGenerating, startGenerationTransition] = useTransition();
  const [isRegenerating, startRegenerationTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  
  const [docs, setDocs] = useState<GenerateDocumentationOutput | null>(null);
  const [originalCodebaseInputForRegen, setOriginalCodebaseInputForRegen] = useState<string>("");
  const [originalUiOnlyModeForRegen, setOriginalUiOnlyModeForRegen] = useState<boolean>(false);


  const [editingSection, setEditingSection] = useState<keyof GenerateDocumentationOutput | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [sectionToRegenerate, setSectionToRegenerate] = useState<keyof GenerateDocumentationOutput | null>(null);
  const [currentUiOnlyMode, setCurrentUiOnlyMode] = useState(false);


  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputMethod: "url",
      codebaseInput: "",
      uiOnlyMode: false,
      uiDescription: "",
    },
  });

  const regenerationForm = useForm<RegenerationFormValues>({
    resolver: zodResolver(regenerationSchema),
    defaultValues: {
      tone: "developer-friendly",
    }
  });

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (values: FormValues) => {
    let codebaseInputValue = "";
    let uiOnlyModeValue = values.uiOnlyMode;
    setCurrentUiOnlyMode(uiOnlyModeValue);


    if (uiOnlyModeValue) {
        if (!values.uiDescription || values.uiDescription.trim() === "") {
            toast({ title: "UI Description Missing", description: "Please provide a UI description or Figma link when UI-Only mode is active.", variant: "destructive" });
            // form.setError("uiDescription", { type: "manual", message: "UI description or Figma link is required." });
            return;
        }
        codebaseInputValue = values.uiDescription;
    } else {
        if (values.inputMethod === "file" && values.codebaseFile) {
            try {
                codebaseInputValue = await readFileAsDataURL(values.codebaseFile);
            } catch (error) {
                console.error("Error reading file:", error);
                toast({ title: "File Read Error", description: "Could not read the uploaded file.", variant: "destructive" });
                return;
            }
        } else if (values.codebaseInput) {
            codebaseInputValue = values.codebaseInput;
        } else {
            toast({ title: "Input Missing", description: "Please provide codebase input (URL, file, or text).", variant: "destructive" });
            return;
        }
    }
    
    setOriginalCodebaseInputForRegen(codebaseInputValue); // Store for regeneration
    setOriginalUiOnlyModeForRegen(uiOnlyModeValue);
    setDocs(null); // Clear previous docs

    startGenerationTransition(async () => {
      try {
        const result = await handleGenerateDocs(codebaseInputValue, uiOnlyModeValue);
        if (result.error) {
          toast({ title: "Generation Failed", description: result.error, variant: "destructive" });
        } else if (result.data) {
          setDocs(result.data);
          toast({ title: "Documentation Generated!", description: "Review your new docs below." });
        }
      } catch (error: any) {
        toast({ title: "Generation Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const handleEditSection = (section: keyof GenerateDocumentationOutput) => {
    if (docs && docs[section]) {
      setEditingSection(section);
      setEditText(docs[section]!);
    }
  };

  const handleSaveEdit = () => {
    if (docs && editingSection) {
      setDocs({ ...docs, [editingSection]: editText });
      setEditingSection(null);
      toast({ title: "Section Saved", description: `${editingSection} updated successfully.` });
    }
  };

  const onRegenerateSubmit = async (regenValues: RegenerationFormValues) => {
    if (!sectionToRegenerate || !originalCodebaseInputForRegen) {
      toast({ title: "Error", description: "Cannot regenerate without original input and section selection.", variant: "destructive" });
      return;
    }
    
    startRegenerationTransition(async () => {
      try {
        const result = await handleRegenerateSection(originalCodebaseInputForRegen, sectionToRegenerate, regenValues.tone, originalUiOnlyModeForRegen);
        if (result.error) {
          toast({ title: "Regeneration Failed", description: result.error, variant: "destructive" });
        } else if (result.data && docs) {
          setDocs({ ...docs, [sectionToRegenerate]: result.data.regeneratedContent });
          toast({ title: "Section Regenerated!", description: `${sectionToRegenerate} updated with a ${regenValues.tone} tone.` });
        }
      } catch (error: any) {
        toast({ title: "Regeneration Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      } finally {
        setShowRegenerateDialog(false);
      }
    });
  };

  const handleDownloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${filename} is downloading.` });
    } else {
      toast({ title: "Download Failed", description: "Your browser doesn't support direct downloads.", variant: "destructive" });
    }
  };

  const triggerExport = async (exportType: 'pdf' | 'notion' | 'gitbook') => {
    if (exportType === 'pdf' || exportType === 'notion') {
      toast({ title: "Feature Coming Soon!", description: `Export to ${exportType} is under development.` });
      return;
    }
    if (!docs) {
      toast({ title: "No Docs to Export", description: "Please generate documentation first.", variant: "destructive" });
      return;
    }

    startExportTransition(async () => {
      try {
        let result: { data?: any; error?: string; message?: string } | undefined;
        if (exportType === 'gitbook') {
          result = await handleExportToGitBook(docs);
          if (result?.data?.content && result.data.fileName && result.data.mimeType) {
            const { fileName, mimeType, content } = result.data;
            const link = document.createElement('a');
            link.href = `data:${mimeType};base64,${content}`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "GitBook Export Ready", description: result.message || `Downloaded ${fileName}. You can now import it into GitBook.` });
          } else if (result?.error) {
            toast({ title: `GitBook Export Failed`, description: result.error, variant: "destructive" });
          } else {
             toast({ title: `GitBook Export Status`, description: result?.message || "An issue occurred during export." });
          }
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        console.error("Export Error:", error);
        toast({ title: "Export Error", description: `An unexpected error occurred during ${exportType} export: ${errorMessage}`, variant: "destructive" });
      }
    });
  };

  const docSectionsConfig = (uiMode: boolean) => [
    { id: 'readme' as keyof GenerateDocumentationOutput, title: uiMode ? "UI Overview" : "README.md", icon: FileCode2 },
    { id: 'apiDocs' as keyof GenerateDocumentationOutput, title: uiMode ? "Key Screens/Components" : "API Docs", icon: GitBranch },
    { id: 'userManual' as keyof GenerateDocumentationOutput, title: uiMode ? "User Flow Ideas" : "User Manual", icon: BookUser },
    { id: 'faq' as keyof GenerateDocumentationOutput, title: "FAQ", icon: MessagesSquare },
  ];
  
  const currentDocSections = docSectionsConfig(currentUiOnlyMode);

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Rocket className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold text-primary">AutoDocify</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Instant Docs from Codebase or UI Descriptions.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Input Your Codebase or UI</CardTitle>
              <CardDescription>Provide a GitHub URL, upload a .zip, paste code, or describe your UI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="uiOnlyMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card-foreground/5">
                    <div className="space-y-0.5">
                      <FormLabel>UI-Only Mode</FormLabel>
                      <FormDescription>
                        Generate docs based on a UI description or Figma/design link.
                      </FormDescription>
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
                          placeholder="e.g., A modern e-commerce dashboard with user authentication, product listings, and a shopping cart. Key screens include login, product catalog, product detail, and checkout. Or, https://figma.com/file/..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="inputMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Input Method for Codebase</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select input method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="url">GitHub URL</SelectItem>
                            <SelectItem value="file">Upload .zip</SelectItem>
                            <SelectItem value="text">Paste Code</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("inputMethod") === "url" && (
                    <FormField
                      control={form.control}
                      name="codebaseInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub Repository URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/your-username/your-repo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("inputMethod") === "file" && (
                    <FormField
                      control={form.control}
                      name="codebaseFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Upload Codebase (.zip)</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".zip,application/zip,application/x-zip-compressed"
                              onChange={(e) => field.onChange(e.target.files?.[0])}
                            />
                          </FormControl>
                          <FormDescription>Max file size: 50MB (conceptual limit).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("inputMethod") === "text" && (
                    <FormField
                      control={form.control}
                      name="codebaseInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paste Your Code</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Paste your code snippet(s) here. For larger projects, consider URL or .zip."
                              className="min-h-[150px] font-mono text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isGenerating || isRegenerating || isExporting}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Generate Documentation
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {(isGenerating || isRegenerating || isExporting) && (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-card rounded-lg shadow-md">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg font-semibold text-muted-foreground">
            {isGenerating && "Crafting your documentation... this may take a moment."}
            {isRegenerating && "Regenerating section with a new perspective..."}
            {isExporting && "Preparing your export..."}
          </p>
          <p className="text-sm text-muted-foreground/80">
            Larger codebases or complex UIs might require more thinking time for the AI.
          </p>
        </div>
      )}

      {docs && !isGenerating && (
        <Card className="shadow-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Generated Documentation</CardTitle>
            <CardDescription>Review, edit, and export your generated documentation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={currentDocSections.length > 0 ? currentDocSections[0].id : undefined} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                {currentDocSections.map(section => (
                  <TabsTrigger key={section.id} value={section.id}>
                    <section.icon className="mr-2 h-4 w-4" />{section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {currentDocSections.map(section => (
                <TabsContent key={section.id} value={section.id} className="mt-4 relative">
                  {editingSection === section.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[300px] font-mono text-xs"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit}><Save className="mr-2 h-4 w-4" />Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MarkdownViewer content={docs[section.id]!} />
                      <div className="absolute top-0 right-0 mt-1 mr-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <TooltipProvider>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEditSection(section.id)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit this section</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => { setSectionToRegenerate(section.id); setShowRegenerateDialog(true); }}>
                                <Rocket className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Regenerate this section</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadMarkdown(`${section.id}.md`, docs[section.id]!)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download as .md</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
             <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-2">Export Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full" onClick={() => triggerExport('pdf')} disabled={true || isExporting}>
                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Export all documentation as a single PDF file. (Coming Soon!)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full" onClick={() => triggerExport('notion')} disabled={true || isExporting}>
                        <NotebookText className="mr-2 h-4 w-4" /> Export to Notion
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Export documentation to your Notion workspace. (Coming Soon!)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="outline" className="w-full" onClick={() => triggerExport('gitbook')} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" /> }
                        Download GitBook .zip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download a .zip file structured for easy import into GitBook.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Documentation Section</DialogTitle>
            <DialogDescription>
              Select a tone to regenerate the <span className="font-semibold">{sectionToRegenerate && docSectionsConfig(originalUiOnlyModeForRegen).find(s => s.id === sectionToRegenerate)?.title}</span> section.
              You can also provide a custom prompt for more specific changes.
            </DialogDescription>
          </DialogHeader>
          <Form {...regenerationForm}>
            <form onSubmit={regenerationForm.handleSubmit(onRegenerateSubmit)} className="space-y-4">
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
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="developer-friendly">Developer-Friendly</SelectItem>
                        <SelectItem value="business-friendly">Business-Friendly</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="informal">Informal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regenerationForm.control}
                name="customPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Focus more on the installation steps. Explain the API authentication in simpler terms." {...field} />
                    </FormControl>
                    <FormDescription>Provide specific instructions to guide the regeneration.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRegenerateDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={isRegenerating}>
                  {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                  Regenerate
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <footer className="text-center mt-12 py-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AutoDocify. Powered by AI.</p>
        <p className="mt-1">
          <a href="https://github.com/your-username/autodocify" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
            View on GitHub (Conceptual)
          </a>
        </p>
      </footer>
    </div>
  );
}

