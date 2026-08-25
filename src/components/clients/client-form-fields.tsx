import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Defaults = {
  legalName?: string;
  tradeName?: string | null;
  taxId?: string;
  externalCode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>);
}

export function ClientFormFields({ defaults = {}, errors }: { defaults?: Defaults; errors?: Record<string, string[] | undefined> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="legalName">Razão social</Label>
        <Input id="legalName" name="legalName" defaultValue={defaults.legalName} className="h-10" required aria-invalid={Boolean(errors?.legalName)} />
        <FieldError errors={errors?.legalName} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tradeName">Nome fantasia</Label>
        <Input id="tradeName" name="tradeName" defaultValue={defaults.tradeName ?? ""} className="h-10" />
        <FieldError errors={errors?.tradeName} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxId">CPF ou CNPJ</Label>
        <Input id="taxId" name="taxId" defaultValue={defaults.taxId} inputMode="numeric" className="h-10" required aria-invalid={Boolean(errors?.taxId)} />
        <FieldError errors={errors?.taxId} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="externalCode">Código interno</Label>
        <Input id="externalCode" name="externalCode" defaultValue={defaults.externalCode ?? ""} className="h-10" />
        <FieldError errors={errors?.externalCode} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactName">Contato comercial</Label>
        <Input id="contactName" name="contactName" defaultValue={defaults.contactName ?? ""} className="h-10" />
        <FieldError errors={errors?.contactName} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactEmail">E-mail comercial</Label>
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaults.contactEmail ?? ""} className="h-10" />
        <FieldError errors={errors?.contactEmail} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactPhone">Telefone</Label>
        <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={defaults.contactPhone ?? ""} className="h-10" />
        <FieldError errors={errors?.contactPhone} />
      </div>
    </div>
  );
}
