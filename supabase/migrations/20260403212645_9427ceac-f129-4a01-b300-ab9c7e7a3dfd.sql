ALTER TABLE public.contract_signatures
ADD COLUMN signer_type text NOT NULL DEFAULT 'cliente';

COMMENT ON COLUMN public.contract_signatures.signer_type IS 'Type of signer: cliente or empresa';