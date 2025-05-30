
"use client";

import type { GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
// Not importing actions as their callers are removed
// import { zodResolver } from "@hookform/resolvers/zod"; // Not used
import { Rocket, FileCode2, BookUser, MessagesSquare, GitBranch } from 'lucide-react'; // Simplified imports
// import Image from 'next/image'; // Not used in simplified version
import React, { useState } from 'react'; // Removed useTransition, useEffect
// import { useForm } from "react-hook-form"; // Not used
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import * as z from "zod"; // Not used

import { Button } from "@/components/ui/button"; // Still used for demo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Not used
// import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Not used
// import { Input } from "@/components/ui/input"; // Not used
// import { Label } from "@/components/ui/label"; // Not used
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Not used
// import { Switch } from "@/components/ui/switch"; // Not used
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Textarea } from '@/components/ui/textarea'; // Not used
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Not used
// import { useToast } from "@/hooks/use-toast"; // Not used

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
  const [docs, setDocs] = useState<GenerateDocumentationOutput | null>(null);
  // All other state and hooks removed for this test.

  const simplifiedDocSections: Array<{ id: keyof GenerateDocumentationOutput; title: string; icon: React.ElementType }> = [
    { id: 'readme', title: 'README / Overview', icon: FileCode2 },
    { id: 'apiDocs', title: 'API Docs / Key Items', icon: GitBranch },
    { id: 'userManual', title: 'User Manual / Flows', icon: BookUser },
    { id: 'faq', title: 'FAQ', icon: MessagesSquare },
  ];

  // Dummy function to simulate setting docs for testing UI
  const handleSimulateDocs = () => {
    setDocs({
      readme: "# Sample README\nThis is a test.",
      apiDocs: "## Sample API Docs\n- Endpoint 1",
      userManual: "### Sample User Manual\nHow to use this.",
      faq: "* Q: Test?\n  A: Yes."
    });
  };
  
  // This console.log helps verify that the JS execution reaches this point before the return statement.
  console.log("Rendering simplified AutoDocifyClientPage component. If this logs, and JSX fails, the issue is very subtle or in JSX itself.");

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Rocket className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold text-primary">AutoDocify</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Docs from code/UI. Instantly. (Simplified Page)
        </p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Simplified Input</CardTitle>
          <CardDescription>This section is heavily simplified for parsing test.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleSimulateDocs} className="w-full">Simulate Doc Generation</Button>
            <p className="mt-4 text-sm text-muted-foreground">
                Form and most generation logic removed for this test. Click button above to populate dummy docs.
            </p>
        </CardContent>
      </Card>

      {/* Loader logic removed as transitions are removed */}
      {/* {(isGenerating || isRegenerating || isExporting) && ( 
        <div>Loading...</div>
      )} */}

      {docs && (
        <Card className="shadow-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Generated Documentation (Simplified)</CardTitle>
            <CardDescription>Review your generated docs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={simplifiedDocSections.length > 0 ? simplifiedDocSections[0].id : undefined} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                {simplifiedDocSections.map(section => (
                  <TabsTrigger key={section.id} value={section.id}>
                    <section.icon className="mr-2 h-4 w-4" />{section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {simplifiedDocSections.map(section => (
                <TabsContent key={section.id} value={section.id} className="mt-4 relative">
                  {/* The following line assumes 'docs' can be indexed by 'section.id'.
                      Make sure GenerateDocumentationOutput allows this.
                      For simplicity, type assertion is used. Consider a safer access pattern in full code. */}
                  {docs[section.id as keyof GenerateDocumentationOutput] ? (
                     <MarkdownViewer content={docs[section.id as keyof GenerateDocumentationOutput]!} />
                  ) : (
                    <p>No content for {section.title}.</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
            {/* Export buttons, regenerate dialog, and edit functionality removed for this test */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
    