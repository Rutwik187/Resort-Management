"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails straight from the Blob store */
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addGalleryPhotos, deleteGalleryPhoto, moveGalleryPhoto, publishText, resetText, saveTextDraft, updateGalleryPhoto } from "./content-actions";

const say = (result: { error?: string; done?: string } | undefined) => {
  if (result?.error) toast.error(result.error);
  else if (result?.done) toast.success(result.done);
};

/** One piece of page text: the words on the site now, a draft, and publish (plan section 2). */
export function TextSlotEditor({ propertyId, slot }: { propertyId: string; slot: { key: string; page: string; label: string; max: number; siteText: string; published: string | null; draft: string | null } }) {
  const [text, setText] = useState(slot.draft ?? slot.published ?? slot.siteText);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (what: string, action: () => Promise<{ error?: string; done?: string } | undefined>) => {
    setBusy(what);
    say(await action());
    setBusy(null);
  };
  const unpublished = slot.draft !== null && slot.draft !== slot.published;
  return (
    <div className="grid gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {slot.page}: <span className="font-normal text-muted-foreground">{slot.label}</span>
        </p>
        {slot.published ? (
          <Badge variant="outline" className="border-primary/30 text-primary">
            {unpublished ? "Published, with a newer draft" : "Published"}
          </Badge>
        ) : unpublished ? (
          <Badge variant="outline" className="text-warn">
            Draft, not on the site
          </Badge>
        ) : (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            The site&apos;s own words
          </Badge>
        )}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={slot.max} aria-label={`${slot.page}: ${slot.label}`} />
      <p className="text-xs text-muted-foreground">
        {text.length} of {slot.max} letters. On the site now: “{slot.published ?? slot.siteText}”
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("save", () => saveTextDraft(propertyId, slot.key, text))}>
          {busy === "save" && <Spinner />}
          Save draft
        </Button>
        <Button size="sm" disabled={busy !== null || (!slot.draft && text === (slot.published ?? slot.siteText))} onClick={() => run("publish", async () => {
          const saved = await saveTextDraft(propertyId, slot.key, text);
          return saved?.error ? saved : publishText(propertyId, slot.key);
        })}>
          {busy === "publish" ? <Spinner /> : <Send />}
          Publish
        </Button>
        {(slot.published || slot.draft) && (
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("reset", async () => {
            const result = await resetText(propertyId, slot.key);
            setText(slot.siteText);
            return result;
          })}>
            <RotateCcw />
            Back to the site&apos;s own words
          </Button>
        )}
      </div>
    </div>
  );
}

export type ManagedPhoto = { id: string; url: string; alt: string | null; caption: string | null; category: string; featured: boolean; hidden: boolean };

/** Reads a photo's size in the browser, so the website can lay it out before it loads. */
async function sizeOf(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

/** The gallery: upload many photos into a category at once, then edit, order, feature, hide or remove them (URD 4.2, CMS-06). */
export function GalleryManager({ propertyId, photos, categories }: { propertyId: string; photos: ManagedPhoto[]; categories: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(categories[0] ?? "Rooms");
  const [progress, setProgress] = useState<string | null>(null);
  const used = [...new Set([...photos.map((p) => p.category), ...categories])];

  async function send(files: FileList) {
    const list = [...files];
    const done: { pathname: string; width: number | null; height: number | null }[] = [];
    try {
      for (const [i, file] of list.entries()) {
        setProgress(`Uploading ${i + 1} of ${list.length}…`);
        const size = await sizeOf(file);
        const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || "photo.jpg";
        const blob = await upload(`photos/${propertyId}/gallery/${safe}`, file, { access: "public", handleUploadUrl: "/api/blob/upload", clientPayload: JSON.stringify({ kind: "photo", propertyId }) });
        done.push({ pathname: blob.pathname, ...size });
      }
      say(await addGalleryPhotos(propertyId, category, done));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An upload didn't go through.");
      if (done.length) say(await addGalleryPhotos(propertyId, category, done));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-56">
          <FieldLabel htmlFor="gallery-category">Category</FieldLabel>
          <Input id="gallery-category" list="gallery-categories" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} />
          <datalist id="gallery-categories">
            {used.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => e.target.files?.length && send(e.target.files)} />
        <Button type="button" disabled={progress !== null || category.trim().length < 2} onClick={() => input.current?.click()}>
          {progress ? <Spinner /> : <ImagePlus />}
          {progress ?? "Add photos"}
        </Button>
      </div>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className={`overflow-hidden rounded-lg border bg-muted/30 ${photo.hidden ? "opacity-50" : ""}`}>
              <img src={photo.url} alt={photo.alt ?? ""} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="grid gap-1 p-2 text-xs">
                <p className="flex items-center justify-between gap-1">
                  <span className="truncate font-medium">{photo.category}</span>
                  {photo.featured && <Badge className="h-5 bg-primary/10 px-1.5 text-[0.7rem] text-primary hover:bg-primary/10">Featured</Badge>}
                </p>
                <p className="line-clamp-2 text-muted-foreground">{photo.alt}</p>
                <div className="flex justify-between">
                  <span className="flex">
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Earlier" onClick={async () => say(await moveGalleryPhoto(photo.id, "up"))}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Later" onClick={async () => say(await moveGalleryPhoto(photo.id, "down"))}>
                      <ArrowDown />
                    </Button>
                  </span>
                  <span className="flex">
                    <PhotoDialog photo={photo} categories={used} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      aria-label="Remove the photo"
                      onClick={async () => {
                        if (window.confirm("Remove this photo from the gallery?")) say(await deleteGalleryPhoto(photo.id));
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoDialog({ photo, categories }: { photo: ManagedPhoto; categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ alt: photo.alt ?? "", caption: photo.caption ?? "", category: photo.category, featured: photo.featured, hidden: photo.hidden });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" aria-label="Change the photo's details">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Photo</DialogTitle>
          <DialogDescription>Alt text describes the photo for people who can&apos;t see it, and for search engines.</DialogDescription>
        </DialogHeader>
        <img src={photo.url} alt="" className="max-h-56 w-full rounded-md object-cover" />
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${photo.id}-alt`}>Alt text</FieldLabel>
            <Input id={`${photo.id}-alt`} value={values.alt} maxLength={160} onChange={(e) => setValues({ ...values, alt: e.target.value })} placeholder="The pool at sunset, with the hills behind" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${photo.id}-caption`}>Caption (optional)</FieldLabel>
            <Input id={`${photo.id}-caption`} value={values.caption} maxLength={200} onChange={(e) => setValues({ ...values, caption: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${photo.id}-category`}>Category</FieldLabel>
            <Input id={`${photo.id}-category`} list={`${photo.id}-categories`} value={values.category} maxLength={40} onChange={(e) => setValues({ ...values, category: e.target.value })} />
            <datalist id={`${photo.id}-categories`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <div className="flex items-center justify-between">
            <Label htmlFor={`${photo.id}-featured`} className="font-normal">
              Featured
            </Label>
            <Switch id={`${photo.id}-featured`} checked={values.featured} onCheckedChange={(featured) => setValues({ ...values, featured })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`${photo.id}-hidden`} className="font-normal">
              Hidden from the website
            </Label>
            <Switch id={`${photo.id}-hidden`} checked={values.hidden} onCheckedChange={(hidden) => setValues({ ...values, hidden })} />
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const result = await updateGalleryPhoto(photo.id, values);
              setBusy(false);
              say(result);
              if (!result?.error) setOpen(false);
            }}
          >
            {busy && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
