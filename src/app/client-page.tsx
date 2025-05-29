"use client";

import type { GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import type { RegenerateDocumentationSectionOutput } from '@/ai/flows/regenerate-documentation-section';
import { handleGenerateDocs, handleRegenerateSection } from '@/lib/actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { Rocket, UploadCloud, Link as LinkIcon, Wand2, ListChecks, FileCode2, BookUser, MessagesSquare, FileDown, GitBranch, RefreshCcw, Edit3, FileType2 } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";

// Define Zod schema for form validation
const formSchema = z.object({
  inputType: z.enum(["url", "file"], { required_error: "Please select an input type" }),
  githubUrl: z.string().optional(),
  codeFile: z.any().optional(),
  uiOnlyMode: z.boolean().default(false),
}).refine(data => {
  if (data.inputType === "url") return !!data.githubUrl && data.githubUrl.trim() !== "";
  if (data.inputType === "file") return !!data.codeFile && data.codeFile.length > 0;
  return false;
}, {
  message: "Please provide a GitHub URL or upload a .zip file.",
  path: ["githubUrl"], // You can refine path to be more specific
});

type FormValues = z.infer<typeof formSchema>;

const regenerationSchema = z.object({
  sectionName: z.string({ required_error: "Please select a section." }),
  tone: z.string({ required_error: "Please select a tone." }),
  customPrompt: z.string().optional(), // For potential inline editing later
});
type RegenerationFormValues = z.infer<typeof regenerationSchema>;


const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  // In a real app, use a library like react-markdown for safety and rich features.
  // For this exercise, using dangerouslySetInnerHTML to render HTML from Markdown.
  // Ensure AI output is sanitized if this were production.
  return <div className="markdown-content p-4 rounded-md bg-card prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content || "<p>No content available.</p>" }} data-ai-hint="markdown rendered content" />;
};


export default function AutoDocifyClientPage() {
  const [isPending, startTransition] = useTransition();
  const [docs, setDocs] = useState<GenerateDocumentationOutput | null>(null);
  const [currentCodebaseInput, setCurrentCodebaseInput] = useState<string>('');
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<{ name: keyof GenerateDocumentationOutput, content: string } | null>(null);


  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputType: "url",
      githubUrl: "",
      uiOnlyMode: false,
    },
  });

  const regenerationForm = useForm<RegenerationFormValues>({
    resolver: zodResolver(regenerationSchema),
  });
  
  const [tempEditedContent, setTempEditedContent] = useState<string>("");

  const handleEditSection = (sectionName: keyof GenerateDocumentationOutput, currentContent: string) => {
    setEditingSection({ name: sectionName, content: currentContent });
    setTempEditedContent(currentContent); // Initialize textarea with current content
  };

  const handleSaveEdit = () => {
    if (editingSection && docs) {
      const updatedDocs = { ...docs, [editingSection.name]: tempEditedContent };
      setDocs(updatedDocs as GenerateDocumentationOutput); // Cast needed as we are sure about the structure
      setEditingSection(null);
      toast({ title: "Section Updated", description: `${editingSection.name} has been updated locally.` });
    }
  };


  const onSubmit = async (values: FormValues) => {
    let codebaseInput = "";

    if (values.inputType === "url" && values.githubUrl) {
      codebaseInput = values.githubUrl;
    } else if (values.inputType === "file" && values.codeFile && values.codeFile[0]) {
      const file = values.codeFile[0];
      if (file.type !== "application/zip" && !file.name.endsWith('.zip')) {
        toast({ title: "Invalid File Type", description: "Please upload a .zip file.", variant: "destructive" });
        return;
      }
      try {
        codebaseInput = await readFileAsDataURL(file);
      } catch (error) {
        toast({ title: "File Read Error", description: "Could not read the uploaded file.", variant: "destructive" });
        return;
      }
    } else {
      toast({ title: "Input Error", description: "Please provide a valid input.", variant: "destructive" });
      return;
    }

    setCurrentCodebaseInput(codebaseInput); // Save for regeneration
    setDocs(null); // Clear previous docs

    startTransition(async () => {
      try {
        const result = await handleGenerateDocs(codebaseInput, values.uiOnlyMode);
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
    if (!currentCodebaseInput) {
      toast({ title: "Error", description: "No codebase context found for regeneration.", variant: "destructive" });
      return;
    }
    if (!docs) {
         toast({ title: "Error", description: "No existing documentation to regenerate from.", variant: "destructive" });
         return;
    }

    startTransition(async () => {
      try {
        const result = await handleRegenerateSection(
          currentCodebaseInput,
          values.sectionName,
          values.tone
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


  const docSections: Array<{ id: keyof GenerateDocumentationOutput; title: string; icon: React.ElementType }> = [
    { id: 'readme', title: 'README.md', icon: FileCode2 },
    { id: 'apiDocs', title: 'API Docs', icon: GitBranch },
    { id: 'userManual', title: 'User Manual', icon: BookUser },
    { id: 'faq', title: 'FAQ', icon: MessagesSquare },
  ];

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
          <CardDescription>Provide your codebase via GitHub URL or .zip file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="inputType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Input Method</FormLabel>
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
              
              <FormField
                control={form.control}
                name="uiOnlyMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        UI-Only Mode
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Analyze UI components (e.g., Figma files). Currently conceptual.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled // Conceptual feature
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">✅ What's included:</h3>
                <ul className="space-y-1 text-muted-foreground list-inside">
                  <li className="flex items-center"><ListChecks className="w-5 h-5 mr-2 text-primary" />README.md</li>
                  <li className="flex items-center"><FileCode2 className="w-5 h-5 mr-2 text-primary" />API Docs</li>
                  <li className="flex items-center"><BookUser className="w-5 h-5 mr-2 text-primary" />User Manual</li>
                  <li className="flex items-center"><MessagesSquare className="w-5 h-5 mr-2 text-primary" />FAQ (from code comments)</li>
                </ul>
              </div>
              
              <Button type="submit" className="w-full text-lg py-6" disabled={isPending}>
                <Wand2 className="mr-2 h-5 w-5" />
                {isPending ? "Generating..." : "Generate Docs 🔥"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isPending && (
        <div className="text-center py-10">
          <div role="status" className="flex flex-col items-center">
              <svg aria-hidden="true" className="w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <p className="mt-4 text-lg text-muted-foreground">Generating documentation... This might take a moment.</p>
              <p className="text-sm text-muted-foreground">Please don't close this page.</p>
          </div>
        </div>
      )}

      {docs && !isPending && (
        <Card className="shadow-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Generated Documentation</CardTitle>
            <CardDescription>Review, edit, and export your new docs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="readme" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                {docSections.map(section => (
                  <TabsTrigger key={section.id} value={section.id}>
                    <section.icon className="mr-2 h-4 w-4" />{section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {docSections.map(section => (
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

            <Card className="mt-8 bg-secondary/50">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" disabled><FileDown className="mr-2 h-4 w-4" />Download PDF</Button>
                <Button variant="outline" disabled><Image src="https://placehold.co/16x16.png" alt="Notion Logo" width={16} height={16} className="mr-2" data-ai-hint="Notion logo"/>Export to Notion</Button>
                <Button variant="outline" disabled><Image src="https://placehold.co/16x16.png" alt="GitBook Logo" width={16} height={16} className="mr-2" data-ai-hint="GitBook logo"/>Export to GitBook</Button>
                <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                  <DialogTrigger asChild>
                    <Button><RefreshCcw className="mr-2 h-4 w-4" />Regenerate Section</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Regenerate Documentation Section</DialogTitle>
                      <DialogDescription>
                        Choose a section and tone to regenerate with AI.
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
                                  {docSections.map(s => (
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
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="developer-friendly">Developer-Friendly</SelectItem>
                                  <SelectItem value="business-friendly">Business-Friendly</SelectItem>
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowRegenerateDialog(false)}>Cancel</Button>
                          <Button type="submit" disabled={isPending}>
                            {isPending ? "Regenerating..." : "Regenerate"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
