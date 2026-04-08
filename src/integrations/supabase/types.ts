export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agendamento_absences: {
        Row: {
          admin_authorized_by: string | null
          agendamento_id: string
          atestado_url: string | null
          created_at: string
          empresa_id: string
          id: string
          notes: string | null
          reposicao_agendamento_id: string | null
          reposicao_utilizada: boolean
          tipo: string
          troca_data: string | null
        }
        Insert: {
          admin_authorized_by?: string | null
          agendamento_id: string
          atestado_url?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          notes?: string | null
          reposicao_agendamento_id?: string | null
          reposicao_utilizada?: boolean
          tipo?: string
          troca_data?: string | null
        }
        Update: {
          admin_authorized_by?: string | null
          agendamento_id?: string
          atestado_url?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          notes?: string | null
          reposicao_agendamento_id?: string | null
          reposicao_utilizada?: boolean
          tipo?: string
          troca_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_absences_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_absences_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_absences_reposicao_agendamento_id_fkey"
            columns: ["reposicao_agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          atendente_id: string | null
          baia: string | null
          cliente_id: string
          created_at: string
          data_entrada: string | null
          data_hora: string
          data_saida: string | null
          data_saida_provavel: string | null
          duracao_min: number | null
          empresa_id: string
          forma_pagamento: string | null
          hora_entrada: string | null
          hora_prevista_buscar: string | null
          hora_prevista_levar: string | null
          hora_saida: string | null
          hora_saida_provavel: string | null
          id: string
          notas: string | null
          pet_id: string
          status: string
          subscription_id: string | null
          tipo_servico: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          atendente_id?: string | null
          baia?: string | null
          cliente_id: string
          created_at?: string
          data_entrada?: string | null
          data_hora: string
          data_saida?: string | null
          data_saida_provavel?: string | null
          duracao_min?: number | null
          empresa_id: string
          forma_pagamento?: string | null
          hora_entrada?: string | null
          hora_prevista_buscar?: string | null
          hora_prevista_levar?: string | null
          hora_saida?: string | null
          hora_saida_provavel?: string | null
          id?: string
          notas?: string | null
          pet_id: string
          status?: string
          subscription_id?: string | null
          tipo_servico: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          atendente_id?: string | null
          baia?: string | null
          cliente_id?: string
          created_at?: string
          data_entrada?: string | null
          data_hora?: string
          data_saida?: string | null
          data_saida_provavel?: string | null
          duracao_min?: number | null
          empresa_id?: string
          forma_pagamento?: string | null
          hora_entrada?: string | null
          hora_prevista_buscar?: string | null
          hora_prevista_levar?: string | null
          hora_saida?: string | null
          hora_saida_provavel?: string | null
          id?: string
          notas?: string | null
          pet_id?: string
          status?: string
          subscription_id?: string | null
          tipo_servico?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_pet_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_contas: {
        Row: {
          api_key: string
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          label: string
          prioridade: number
          teto_mensal: number | null
          updated_at: string
        }
        Insert: {
          api_key: string
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          label?: string
          prioridade?: number
          teto_mensal?: number | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          label?: string
          prioridade?: number
          teto_mensal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_contas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          empresa_id: string
          id: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          empresa_id: string
          id?: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string
          id?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flow_steps: {
        Row: {
          condition_config: Json | null
          created_at: string
          delay_seconds: number | null
          empresa_id: string
          flow_id: string
          id: string
          message: string | null
          next_step_id: string | null
          options: Json | null
          position: number
          position_x: number | null
          position_y: number | null
          step_type: string
        }
        Insert: {
          condition_config?: Json | null
          created_at?: string
          delay_seconds?: number | null
          empresa_id: string
          flow_id: string
          id?: string
          message?: string | null
          next_step_id?: string | null
          options?: Json | null
          position?: number
          position_x?: number | null
          position_y?: number | null
          step_type?: string
        }
        Update: {
          condition_config?: Json | null
          created_at?: string
          delay_seconds?: number | null
          empresa_id?: string
          flow_id?: string
          id?: string
          message?: string | null
          next_step_id?: string | null
          options?: Json | null
          position?: number
          position_x?: number | null
          position_y?: number | null
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flow_steps_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          name: string
          trigger_keyword: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          empresa_id: string
          id?: string
          name: string
          trigger_keyword?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          name?: string
          trigger_keyword?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flows_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_regras: {
        Row: {
          ativo: boolean
          created_at: string
          dias_semana: number[] | null
          empresa_id: string
          gatilho: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nome: string
          ordem: number
          resposta: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          empresa_id: string
          gatilho?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome: string
          ordem?: number
          resposta: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          empresa_id?: string
          gatilho?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome?: string
          ordem?: number
          resposta?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_regras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_registros: {
        Row: {
          agendamento_id: string
          created_at: string
          empresa_id: string
          id: string
          pet_id: string
          respostas: Json
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          empresa_id: string
          id?: string
          pet_id: string
          respostas?: Json
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          pet_id?: string
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "checklist_registros_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_registros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_registros_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          asaas_customer_id: string | null
          cep: string | null
          como_conheceu: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          deleted_at: string | null
          dia_vencimento_fatura: number
          dias_gerar_fatura: number
          email: string | null
          empresa_id: string
          endereco: string | null
          foto_url: string | null
          id: string
          nome: string
          notas: string | null
          tags: string[] | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          cep?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deleted_at?: string | null
          dia_vencimento_fatura?: number
          dias_gerar_fatura?: number
          email?: string | null
          empresa_id: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          notas?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          cep?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deleted_at?: string | null
          dia_vencimento_fatura?: number
          dias_gerar_fatura?: number
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          notas?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_whatsapp: {
        Row: {
          created_at: string
          data_conexao: string | null
          empresa_id: string
          id: string
          numero: string | null
          session_data: Json | null
          status: string
          ultima_atividade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conexao?: string | null
          empresa_id: string
          id?: string
          numero?: string | null
          session_data?: Json | null
          status?: string
          ultima_atividade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conexao?: string | null
          empresa_id?: string
          id?: string
          numero?: string | null
          session_data?: Json | null
          status?: string
          ultima_atividade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_whatsapp_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tasks: {
        Row: {
          assigned_user_id: string | null
          cliente_id: string
          created_at: string
          description: string | null
          due_date: string | null
          empresa_id: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          cliente_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          empresa_id: string
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          cliente_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          empresa_id?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tasks_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tasks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          banco: string
          conta: string | null
          created_at: string
          empresa_id: string
          id: string
          saldo_atual: number
          saldo_inicial: number
          titular: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco: string
          conta?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          saldo_atual?: number
          saldo_inicial?: number
          titular: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string
          conta?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          saldo_atual?: number
          saldo_inicial?: number
          titular?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string
          empresa_id: string
          fornecedor: string
          id: string
          parcelas: number | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao: string
          empresa_id: string
          fornecedor: string
          id?: string
          parcelas?: number | null
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string
          fornecedor?: string
          id?: string
          parcelas?: number | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          asaas_payment_id: string | null
          banco: string | null
          categoria: string | null
          cliente_id: string | null
          created_at: string
          data_baixa: string | null
          descricao: string
          empresa_id: string
          id: string
          observacao_baixa: string | null
          status: string
          transport_booking_id: string | null
          updated_at: string
          valor: number
          valor_desconto: number | null
          valor_juros: number | null
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          asaas_payment_id?: string | null
          banco?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data_baixa?: string | null
          descricao: string
          empresa_id: string
          id?: string
          observacao_baixa?: string | null
          status?: string
          transport_booking_id?: string | null
          updated_at?: string
          valor: number
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          asaas_payment_id?: string | null
          banco?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data_baixa?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          observacao_baixa?: string | null
          status?: string
          transport_booking_id?: string | null
          updated_at?: string
          valor?: number
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_transport_booking_id_fkey"
            columns: ["transport_booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string
          description: string | null
          empresa_id: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string | null
          empresa_id: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string | null
          empresa_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          acceptance_text: string
          content_hash: string
          contract_id: string
          created_at: string
          empresa_id: string
          id: string
          signature_image: string | null
          signed_at: string
          signer_device: string | null
          signer_document: string | null
          signer_email: string | null
          signer_ip: string | null
          signer_latitude: number | null
          signer_longitude: number | null
          signer_name: string
          signer_type: string
          signer_user_agent: string | null
        }
        Insert: {
          acceptance_text?: string
          content_hash: string
          contract_id: string
          created_at?: string
          empresa_id: string
          id?: string
          signature_image?: string | null
          signed_at?: string
          signer_device?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_latitude?: number | null
          signer_longitude?: number | null
          signer_name: string
          signer_type?: string
          signer_user_agent?: string | null
        }
        Update: {
          acceptance_text?: string
          content_hash?: string
          contract_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          signature_image?: string | null
          signed_at?: string
          signer_device?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_latitude?: number | null
          signer_longitude?: number | null
          signer_name?: string
          signer_type?: string
          signer_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          content: string
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          name: string
          placeholders: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          description?: string | null
          empresa_id: string
          id?: string
          name: string
          placeholders?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          name?: string
          placeholders?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          cliente_id: string | null
          content: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          pdf_url: string | null
          sent_at: string | null
          signed_at: string | null
          signing_token: string | null
          status: string
          template_id: string | null
          title: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          content: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          pdf_url?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          template_id?: string | null
          title: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          content?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          pdf_url?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          template_id?: string | null
          title?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      conversa_tags: {
        Row: {
          conversa_id: string
          created_at: string
          empresa_id: string
          id: string
          tag_id: string
        }
        Insert: {
          conversa_id: string
          created_at?: string
          empresa_id: string
          id?: string
          tag_id: string
        }
        Update: {
          conversa_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversa_tags_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversa_tags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversa_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          atendente_id: string | null
          cliente_id: string | null
          contato_nome: string
          contato_telefone: string
          created_at: string
          empresa_id: string
          id: string
          is_archived: boolean
          is_favorited: boolean
          last_message_preview: string | null
          status: string
          ultima_mensagem_at: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          atendente_id?: string | null
          cliente_id?: string | null
          contato_nome: string
          contato_telefone: string
          created_at?: string
          empresa_id: string
          id?: string
          is_archived?: boolean
          is_favorited?: boolean
          last_message_preview?: string | null
          status?: string
          ultima_mensagem_at?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          atendente_id?: string | null
          cliente_id?: string | null
          contato_nome?: string
          contato_telefone?: string
          created_at?: string
          empresa_id?: string
          id?: string
          is_archived?: boolean
          is_favorited?: boolean
          last_message_preview?: string | null
          status?: string
          ultima_mensagem_at?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          color: string
          created_at: string
          empresa_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          empresa_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          empresa_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string | null
          cliente_id: string
          complement: string | null
          created_at: string
          empresa_id: string
          id: string
          is_primary: boolean
          label: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          number: string | null
          reference: string | null
          state: string | null
          street: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          cliente_id: string
          complement?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          is_primary?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          reference?: string | null
          state?: string | null
          street?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          cliente_id?: string
          complement?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          is_primary?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          reference?: string | null
          state?: string | null
          street?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          file_url: string
          id: string
          title: string
          type: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          file_url: string
          id?: string
          title: string
          type?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          file_url?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pet_subscriptions: {
        Row: {
          auto_renew: boolean | null
          cliente_id: string
          contract_date: string | null
          contract_end_date: string | null
          created_at: string
          discount_amount: number | null
          empresa_id: string
          end_date: string | null
          extra_session_policy: string | null
          final_price: number
          frequency: string
          id: string
          next_renewal_date: string | null
          notes: string | null
          package_id: string | null
          payment_method: string | null
          pet_id: string | null
          plan_id: string | null
          planned_days: number[] | null
          price_contracted: number
          sold_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          cliente_id: string
          contract_date?: string | null
          contract_end_date?: string | null
          created_at?: string
          discount_amount?: number | null
          empresa_id: string
          end_date?: string | null
          extra_session_policy?: string | null
          final_price?: number
          frequency?: string
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          pet_id?: string | null
          plan_id?: string | null
          planned_days?: number[] | null
          price_contracted?: number
          sold_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          cliente_id?: string
          contract_date?: string | null
          contract_end_date?: string | null
          created_at?: string
          discount_amount?: number | null
          empresa_id?: string
          end_date?: string | null
          extra_session_policy?: string | null
          final_price?: number
          frequency?: string
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          pet_id?: string | null
          plan_id?: string | null
          planned_days?: number[] | null
          price_contracted?: number
          sold_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pet_subscriptions_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pet_subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pet_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pet_subscriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pet_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pet_subscriptions_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_requests: {
        Row: {
          assigned_user_id: string | null
          cliente_id: string
          created_at: string
          description: string
          empresa_id: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          cliente_id: string
          created_at?: string
          description: string
          empresa_id: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          cliente_id?: string
          created_at?: string
          description?: string
          empresa_id?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_requests_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_requests_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_fiscais_empresa: {
        Row: {
          cnpj: string | null
          codigo_municipio: string | null
          created_at: string
          email: string | null
          empresa_id: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          razao_social: string | null
          regime_tributario: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          codigo_municipio?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          codigo_municipio?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dados_fiscais_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          document: string | null
          driver_license: string | null
          driver_license_expiration: string | null
          email: string | null
          empresa_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          document?: string | null
          driver_license?: string | null
          driver_license_expiration?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          document?: string | null
          driver_license?: string | null
          driver_license_expiration?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cep: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          endereco_numero: string | null
          horario_domingo_fim: string | null
          horario_domingo_inicio: string | null
          horario_sabado_fim: string | null
          horario_sabado_inicio: string | null
          horario_semana_fim: string | null
          horario_semana_inicio: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          nome_empresa: string
          nome_fantasia: string | null
          plano: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          endereco_numero?: string | null
          horario_domingo_fim?: string | null
          horario_domingo_inicio?: string | null
          horario_sabado_fim?: string | null
          horario_sabado_inicio?: string | null
          horario_semana_fim?: string | null
          horario_semana_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome_empresa: string
          nome_fantasia?: string | null
          plano?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          endereco_numero?: string | null
          horario_domingo_fim?: string | null
          horario_domingo_inicio?: string | null
          horario_sabado_fim?: string | null
          horario_sabado_inicio?: string | null
          horario_semana_fim?: string | null
          horario_semana_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome_empresa?: string
          nome_fantasia?: string | null
          plano?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estou_chegando: {
        Row: {
          active: boolean
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          latitude: number | null
          longitude: number | null
          pet_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pet_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estou_chegando_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estou_chegando_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estou_chegando_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_settings: {
        Row: {
          ambiente: string | null
          cfop_padrao: string | null
          cnpj: string | null
          created_at: string
          empresa_id: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_codigo_municipio: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_municipio: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          id: string
          inscricao_estadual: string | null
          natureza_operacao_padrao: string | null
          nome_fantasia: string | null
          razao_social: string | null
          regime_tributario: string | null
          serie_padrao: string | null
          token_focus: string | null
          updated_at: string
          webhook_ativo: boolean | null
          webhook_url: string | null
        }
        Insert: {
          ambiente?: string | null
          cfop_padrao?: string | null
          cnpj?: string | null
          created_at?: string
          empresa_id: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_codigo_municipio?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          natureza_operacao_padrao?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          serie_padrao?: string | null
          token_focus?: string | null
          updated_at?: string
          webhook_ativo?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          ambiente?: string | null
          cfop_padrao?: string | null
          cnpj?: string | null
          created_at?: string
          empresa_id?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_codigo_municipio?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          natureza_operacao_padrao?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          serie_padrao?: string | null
          token_focus?: string | null
          updated_at?: string
          webhook_ativo?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_vendas: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          estagio: string
          id: string
          notas: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          estagio?: string
          id?: string
          notas?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          estagio?: string
          id?: string
          notas?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funil_vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_interacoes: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_interacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_interacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_servicos: {
        Row: {
          agendamento_id: string | null
          cliente_id: string
          created_at: string
          data_servico: string
          empresa_id: string
          id: string
          notas: string | null
          pet_id: string | null
          tipo_servico: string
          valor: number | null
        }
        Insert: {
          agendamento_id?: string | null
          cliente_id: string
          created_at?: string
          data_servico?: string
          empresa_id: string
          id?: string
          notas?: string | null
          pet_id?: string | null
          tipo_servico: string
          valor?: number | null
        }
        Update: {
          agendamento_id?: string | null
          cliente_id?: string
          created_at?: string
          data_servico?: string
          empresa_id?: string
          id?: string
          notas?: string | null
          pet_id?: string | null
          tipo_servico?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_servicos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_servicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_servicos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      hospedagens: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrada: string
          data_saida: string | null
          empresa_id: string
          id: string
          notas: string | null
          pet_id: string
          status: string
          updated_at: string
          valor_diaria: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrada: string
          data_saida?: string | null
          empresa_id: string
          id?: string
          notas?: string | null
          pet_id: string
          status?: string
          updated_at?: string
          valor_diaria: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrada?: string
          data_saida?: string | null
          empresa_id?: string
          id?: string
          notas?: string | null
          pet_id?: string
          status?: string
          updated_at?: string
          valor_diaria?: number
        }
        Relationships: [
          {
            foreignKeyName: "hospedagens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospedagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospedagens_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          empresa: string | null
          id: string
          mensagem: string | null
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          mensagem?: string | null
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          mensagem?: string | null
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      manejo_registros: {
        Row: {
          agendamento_id: string
          created_at: string
          empresa_id: string
          id: string
          pet_id: string
          respostas: Json
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          empresa_id: string
          id?: string
          pet_id: string
          respostas?: Json
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          pet_id?: string
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "manejo_registros_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manejo_registros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manejo_registros_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string
          empresa_id: string
          id: string
          remetente: string
          tipo: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string
          empresa_id: string
          id?: string
          remetente: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          remetente?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          banco: string | null
          complemento: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_movimentacao: string
          empresa_id: string
          id: string
          pessoa: string | null
          plano_contas: string | null
          tipo: string
          valor: number
        }
        Insert: {
          banco?: string | null
          complemento?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimentacao?: string
          empresa_id: string
          id?: string
          pessoa?: string | null
          plano_contas?: string | null
          tipo?: string
          valor?: number
        }
        Update: {
          banco?: string | null
          complemento?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimentacao?: string
          empresa_id?: string
          id?: string
          pessoa?: string | null
          plano_contas?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_documents: {
        Row: {
          ambiente: string | null
          chave_nfe: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_entrada_saida: string | null
          dest_bairro: string | null
          dest_cep: string | null
          dest_codigo_municipio: string | null
          dest_complemento: string | null
          dest_cpf_cnpj: string | null
          dest_email: string | null
          dest_inscricao_estadual: string | null
          dest_logradouro: string | null
          dest_municipio: string | null
          dest_nome: string | null
          dest_numero: string | null
          dest_telefone: string | null
          dest_uf: string | null
          empresa_id: string
          finalidade_emissao: string | null
          focus_code: string | null
          focus_message: string | null
          focus_status: string | null
          id: string
          informacoes_complementares: string | null
          informacoes_fisco: string | null
          natureza_operacao: string | null
          numero: string | null
          payload_response: Json | null
          payload_sent: Json | null
          pdf_url: string | null
          protocolo_autorizacao: string | null
          reference: string
          serie: string | null
          status: string
          tipo_operacao: string | null
          updated_at: string
          valor_desconto: number | null
          valor_frete: number | null
          valor_outras: number | null
          valor_produtos: number | null
          valor_seguro: number | null
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          ambiente?: string | null
          chave_nfe?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_entrada_saida?: string | null
          dest_bairro?: string | null
          dest_cep?: string | null
          dest_codigo_municipio?: string | null
          dest_complemento?: string | null
          dest_cpf_cnpj?: string | null
          dest_email?: string | null
          dest_inscricao_estadual?: string | null
          dest_logradouro?: string | null
          dest_municipio?: string | null
          dest_nome?: string | null
          dest_numero?: string | null
          dest_telefone?: string | null
          dest_uf?: string | null
          empresa_id: string
          finalidade_emissao?: string | null
          focus_code?: string | null
          focus_message?: string | null
          focus_status?: string | null
          id?: string
          informacoes_complementares?: string | null
          informacoes_fisco?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          payload_response?: Json | null
          payload_sent?: Json | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          reference: string
          serie?: string | null
          status?: string
          tipo_operacao?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_outras?: number | null
          valor_produtos?: number | null
          valor_seguro?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          ambiente?: string | null
          chave_nfe?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_entrada_saida?: string | null
          dest_bairro?: string | null
          dest_cep?: string | null
          dest_codigo_municipio?: string | null
          dest_complemento?: string | null
          dest_cpf_cnpj?: string | null
          dest_email?: string | null
          dest_inscricao_estadual?: string | null
          dest_logradouro?: string | null
          dest_municipio?: string | null
          dest_nome?: string | null
          dest_numero?: string | null
          dest_telefone?: string | null
          dest_uf?: string | null
          empresa_id?: string
          finalidade_emissao?: string | null
          focus_code?: string | null
          focus_message?: string | null
          focus_status?: string | null
          id?: string
          informacoes_complementares?: string | null
          informacoes_fisco?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          payload_response?: Json | null
          payload_sent?: Json | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          reference?: string
          serie?: string | null
          status?: string
          tipo_operacao?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_outras?: number | null
          valor_produtos?: number | null
          valor_seguro?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_documents_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_documents_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          empresa_id: string
          event_code: string | null
          event_message: string | null
          event_type: string
          id: string
          nfe_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          empresa_id: string
          event_code?: string | null
          event_message?: string | null
          event_type: string
          id?: string
          nfe_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          empresa_id?: string
          event_code?: string | null
          event_message?: string | null
          event_type?: string
          id?: string
          nfe_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_events_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_items: {
        Row: {
          cfop: string | null
          codigo_produto: string | null
          cofins_aliquota: number | null
          cofins_cst: string | null
          cofins_valor: number | null
          created_at: string
          cst_csosn: string | null
          descricao: string
          empresa_id: string
          icms_aliquota: number | null
          icms_base_calculo: number | null
          icms_valor: number | null
          id: string
          ncm: string | null
          nfe_id: string
          numero_item: number
          origem: string | null
          pis_aliquota: number | null
          pis_cst: string | null
          pis_valor: number | null
          quantidade: number | null
          unidade: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          cfop?: string | null
          codigo_produto?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          cst_csosn?: string | null
          descricao: string
          empresa_id: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nfe_id: string
          numero_item?: number
          origem?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          quantidade?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cfop?: string | null
          codigo_produto?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          cst_csosn?: string | null
          descricao?: string
          empresa_id?: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nfe_id?: string
          numero_item?: number
          origem?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          quantidade?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_rejections: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nfe_id: string
          rejection_code: string | null
          rejection_message: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nfe_id: string
          rejection_code?: string | null
          rejection_message?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nfe_id?: string
          rejection_code?: string | null
          rejection_message?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_rejections_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_rejections_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_webhook_logs: {
        Row: {
          created_at: string
          empresa_id: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          reference: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          reference?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_webhook_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_contato: {
        Row: {
          autor_id: string | null
          cliente_id: string
          conteudo: string
          created_at: string
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          cliente_id: string
          conteudo: string
          created_at?: string
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          cliente_id?: string
          conteudo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_contato_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_contato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_contato_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          agendamento_id: string | null
          chave_acesso: string | null
          cliente_cpf_cnpj: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          dados_envio: Json | null
          data_emissao: string | null
          descricao: string | null
          empresa_id: string
          id: string
          mensagem_erro: string | null
          numero: string | null
          referencia: string
          resposta_api: Json | null
          serie: string | null
          status: string
          tipo: string
          updated_at: string
          url_pdf: string | null
          url_xml: string | null
          valor_total: number
        }
        Insert: {
          agendamento_id?: string | null
          chave_acesso?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          dados_envio?: Json | null
          data_emissao?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          mensagem_erro?: string | null
          numero?: string | null
          referencia: string
          resposta_api?: Json | null
          serie?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          url_pdf?: string | null
          url_xml?: string | null
          valor_total?: number
        }
        Update: {
          agendamento_id?: string | null
          chave_acesso?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          dados_envio?: Json | null
          data_emissao?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          mensagem_erro?: string | null
          numero?: string | null
          referencia?: string
          resposta_api?: Json | null
          serie?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          url_pdf?: string | null
          url_xml?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_users: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          empresa_id: string
          id: string
          jornada_id: string | null
          nome: string
          pin: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          empresa_id: string
          id?: string
          jornada_id?: string | null
          nome: string
          pin?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          empresa_id?: string
          id?: string
          jornada_id?: string | null
          nome?: string
          pin?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_users_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_users_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "ponto_configuracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_media: {
        Row: {
          caption: string | null
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          media_type: string
          media_url: string
          pet_id: string
        }
        Insert: {
          caption?: string | null
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          media_type?: string
          media_url: string
          pet_id: string
        }
        Update: {
          caption?: string | null
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          media_type?: string
          media_url?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_media_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_media_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_media_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          antiparasitario_data: string | null
          castrado: string | null
          cliente_id: string
          comportamento: string | null
          cor: string | null
          created_at: string
          data_nascimento: string | null
          empresa_id: string
          especie: string
          foto_url: string | null
          giardia_data: string | null
          gripe_data: string | null
          id: string
          idade: string | null
          medicacoes: string | null
          nome: string
          pelagem: string | null
          peso: number | null
          porte: string | null
          raca: string | null
          raiva_data: string | null
          restricoes_alimentares: string | null
          sexo: string | null
          updated_at: string
          v10_data: string | null
          vacinas: string | null
        }
        Insert: {
          antiparasitario_data?: string | null
          castrado?: string | null
          cliente_id: string
          comportamento?: string | null
          cor?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id: string
          especie?: string
          foto_url?: string | null
          giardia_data?: string | null
          gripe_data?: string | null
          id?: string
          idade?: string | null
          medicacoes?: string | null
          nome: string
          pelagem?: string | null
          peso?: number | null
          porte?: string | null
          raca?: string | null
          raiva_data?: string | null
          restricoes_alimentares?: string | null
          sexo?: string | null
          updated_at?: string
          v10_data?: string | null
          vacinas?: string | null
        }
        Update: {
          antiparasitario_data?: string | null
          castrado?: string | null
          cliente_id?: string
          comportamento?: string | null
          cor?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id?: string
          especie?: string
          foto_url?: string | null
          giardia_data?: string | null
          gripe_data?: string | null
          id?: string
          idade?: string | null
          medicacoes?: string | null
          nome?: string
          pelagem?: string | null
          peso?: number | null
          porte?: string | null
          raca?: string | null
          raiva_data?: string | null
          restricoes_alimentares?: string | null
          sexo?: string | null
          updated_at?: string
          v10_data?: string | null
          vacinas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas_categorias: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          ordem: number
          tipo: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          tipo?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas_items: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_items_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "plano_contas_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_configuracoes: {
        Row: {
          created_at: string
          dias_trabalho: number[]
          empresa_id: string
          horario_entrada: string | null
          horario_pausa: string | null
          horario_retorno: string | null
          horario_saida: string | null
          id: string
          intervalo_min: number
          jornada_diaria_min: number
          nome: string
          regime_horas: string
          tolerancia_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_trabalho?: number[]
          empresa_id: string
          horario_entrada?: string | null
          horario_pausa?: string | null
          horario_retorno?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_min?: number
          jornada_diaria_min?: number
          nome?: string
          regime_horas?: string
          tolerancia_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_trabalho?: number[]
          empresa_id?: string
          horario_entrada?: string | null
          horario_pausa?: string | null
          horario_retorno?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_min?: number
          jornada_diaria_min?: number
          nome?: string
          regime_horas?: string
          tolerancia_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_jornadas: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          horas_esperadas_min: number | null
          horas_trabalhadas_min: number | null
          id: string
          operational_user_id: string
          saldo_min: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          horas_esperadas_min?: number | null
          horas_trabalhadas_min?: number | null
          id?: string
          operational_user_id: string
          saldo_min?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          horas_esperadas_min?: number | null
          horas_trabalhadas_min?: number | null
          id?: string
          operational_user_id?: string
          saldo_min?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_jornadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_jornadas_operational_user_id_fkey"
            columns: ["operational_user_id"]
            isOneToOne: false
            referencedRelation: "operational_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          created_at: string
          data_hora: string
          empresa_id: string
          id: string
          latitude: number | null
          longitude: number | null
          motivo_alteracao: string | null
          observacao: string | null
          operational_user_id: string
          selfie_url: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          empresa_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo_alteracao?: string | null
          observacao?: string | null
          operational_user_id: string
          selfie_url?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          empresa_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo_alteracao?: string | null
          observacao?: string | null
          operational_user_id?: string
          selfie_url?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_registros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_registros_operational_user_id_fkey"
            columns: ["operational_user_id"]
            isOneToOne: false
            referencedRelation: "operational_users"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aprovado: boolean
          cargo: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nome: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          empresa_id: string
          id: string
          shortcut: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          empresa_id: string
          id?: string
          shortcut?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          empresa_id?: string
          id?: string
          shortcut?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_items: {
        Row: {
          created_at: string
          empresa_id: string
          extra_unit_price: number | null
          id: string
          package_id: string
          quantity_included: number
          service_name: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          extra_unit_price?: number | null
          id?: string
          package_id: string
          quantity_included?: number
          service_name: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          extra_unit_price?: number | null
          id?: string
          package_id?: string
          quantity_included?: number
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          name: string
          notes: string | null
          price: number
          status: string
          total_credits: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id: string
          id?: string
          name: string
          notes?: string | null
          price?: number
          status?: string
          total_credits?: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          name?: string
          notes?: string | null
          price?: number
          status?: string
          total_credits?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plan_items: {
        Row: {
          created_at: string
          empresa_id: string
          extra_unit_price: number | null
          id: string
          limit_per_month: number | null
          limit_per_week: number | null
          plan_id: string
          quantity_included: number
          service_name: string
          usage_period: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          extra_unit_price?: number | null
          id?: string
          limit_per_month?: number | null
          limit_per_week?: number | null
          plan_id: string
          quantity_included?: number
          service_name: string
          usage_period?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          extra_unit_price?: number | null
          id?: string
          limit_per_month?: number | null
          limit_per_week?: number | null
          plan_id?: string
          quantity_included?: number
          service_name?: string
          usage_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          allows_replacement: boolean
          auto_renew: boolean | null
          cancellation_fee: number | null
          contract_duration_months: number | null
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          min_loyalty_months: number | null
          name: string
          notes: string | null
          pause_fee: number | null
          price: number
          recurring_type: string | null
          rollover_enabled: boolean | null
          status: string
          type: string
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          allows_replacement?: boolean
          auto_renew?: boolean | null
          cancellation_fee?: number | null
          contract_duration_months?: number | null
          created_at?: string
          description?: string | null
          empresa_id: string
          id?: string
          min_loyalty_months?: number | null
          name: string
          notes?: string | null
          pause_fee?: number | null
          price?: number
          recurring_type?: string | null
          rollover_enabled?: boolean | null
          status?: string
          type?: string
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          allows_replacement?: boolean
          auto_renew?: boolean | null
          cancellation_fee?: number | null
          contract_duration_months?: number | null
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          min_loyalty_months?: number | null
          name?: string
          notes?: string | null
          pause_fee?: number | null
          price?: number
          recurring_type?: string | null
          rollover_enabled?: boolean | null
          status?: string
          type?: string
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          considerar_dia: boolean
          created_at: string
          descricao: string
          diaria_24h: boolean
          empresa_id: string
          id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          considerar_dia?: boolean
          created_at?: string
          descricao: string
          diaria_24h?: boolean
          empresa_id: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          considerar_dia?: boolean
          created_at?: string
          descricao?: string
          diaria_24h?: boolean
          empresa_id?: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string
          event_type: string
          id: string
          metadata: Json | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_pet_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage_logs: {
        Row: {
          agendamento_id: string | null
          created_at: string
          empresa_id: string
          extra_amount: number | null
          id: string
          notes: string | null
          pet_id: string | null
          quantity_used: number
          service_name: string
          subscription_id: string
          usage_date: string
          was_extra: boolean | null
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          empresa_id: string
          extra_amount?: number | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          quantity_used?: number
          service_name: string
          subscription_id: string
          usage_date?: string
          was_extra?: boolean | null
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          empresa_id?: string
          extra_amount?: number | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          quantity_used?: number
          service_name?: string
          subscription_id?: string
          usage_date?: string
          was_extra?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_logs_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_pet_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      taxas_financeiras: {
        Row: {
          ativo: boolean
          bandeira: string | null
          created_at: string
          empresa_id: string
          id: string
          parcelas_ate: number | null
          parcelas_de: number | null
          percentual: number
          tipo: string
          updated_at: string
          valor_fixo: number
        }
        Insert: {
          ativo?: boolean
          bandeira?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          parcelas_ate?: number | null
          parcelas_de?: number | null
          percentual?: number
          tipo?: string
          updated_at?: string
          valor_fixo?: number
        }
        Update: {
          ativo?: boolean
          bandeira?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          parcelas_ate?: number | null
          parcelas_de?: number | null
          percentual?: number
          tipo?: string
          updated_at?: string
          valor_fixo?: number
        }
        Relationships: [
          {
            foreignKeyName: "taxas_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_servico: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_bookings: {
        Row: {
          actual_dropoff_time: string | null
          actual_pickup_time: string | null
          cliente_id: string
          created_at: string
          discount: number
          driver_id: string | null
          dropoff_address_id: string | null
          empresa_id: string
          extra_fee: number
          final_price: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          pet_id: string
          pickup_address_id: string | null
          price: number
          recurring_rule_id: string | null
          related_service_id: string | null
          scheduled_date: string
          scheduled_dropoff_time: string | null
          scheduled_pickup_time: string | null
          special_instructions: string | null
          status: string
          transport_type_id: string | null
          trip_type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_dropoff_time?: string | null
          actual_pickup_time?: string | null
          cliente_id: string
          created_at?: string
          discount?: number
          driver_id?: string | null
          dropoff_address_id?: string | null
          empresa_id: string
          extra_fee?: number
          final_price?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          pet_id: string
          pickup_address_id?: string | null
          price?: number
          recurring_rule_id?: string | null
          related_service_id?: string | null
          scheduled_date: string
          scheduled_dropoff_time?: string | null
          scheduled_pickup_time?: string | null
          special_instructions?: string | null
          status?: string
          transport_type_id?: string | null
          trip_type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_dropoff_time?: string | null
          actual_pickup_time?: string | null
          cliente_id?: string
          created_at?: string
          discount?: number
          driver_id?: string | null
          dropoff_address_id?: string | null
          empresa_id?: string
          extra_fee?: number
          final_price?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          pet_id?: string
          pickup_address_id?: string | null
          price?: number
          recurring_rule_id?: string | null
          related_service_id?: string | null
          scheduled_date?: string
          scheduled_dropoff_time?: string | null
          scheduled_pickup_time?: string | null
          special_instructions?: string | null
          status?: string
          transport_type_id?: string | null
          trip_type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_bookings_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_dropoff_address_id_fkey"
            columns: ["dropoff_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_pickup_address_id_fkey"
            columns: ["pickup_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "transport_recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_transport_type_id_fkey"
            columns: ["transport_type_id"]
            isOneToOne: false
            referencedRelation: "transport_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_events: {
        Row: {
          booking_id: string
          created_at: string
          description: string | null
          empresa_id: string
          event_type: string
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description?: string | null
          empresa_id: string
          event_type: string
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string | null
          empresa_id?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_recurring_rules: {
        Row: {
          cliente_id: string
          created_at: string
          dropoff_address_id: string | null
          empresa_id: string
          end_date: string | null
          id: string
          notes: string | null
          pet_id: string
          pickup_address_id: string | null
          pickup_time: string | null
          preferred_driver_id: string | null
          preferred_vehicle_id: string | null
          start_date: string
          status: string
          transport_type_id: string | null
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dropoff_address_id?: string | null
          empresa_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          pickup_address_id?: string | null
          pickup_time?: string | null
          preferred_driver_id?: string | null
          preferred_vehicle_id?: string | null
          start_date?: string
          status?: string
          transport_type_id?: string | null
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dropoff_address_id?: string | null
          empresa_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          pickup_address_id?: string | null
          pickup_time?: string | null
          preferred_driver_id?: string | null
          preferred_vehicle_id?: string | null
          start_date?: string
          status?: string
          transport_type_id?: string | null
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "transport_recurring_rules_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_dropoff_address_id_fkey"
            columns: ["dropoff_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_pickup_address_id_fkey"
            columns: ["pickup_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_preferred_driver_id_fkey"
            columns: ["preferred_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_preferred_vehicle_id_fkey"
            columns: ["preferred_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_recurring_rules_transport_type_id_fkey"
            columns: ["transport_type_id"]
            isOneToOne: false
            referencedRelation: "transport_types"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_route_items: {
        Row: {
          actual_time: string | null
          booking_id: string
          created_at: string
          driver_id: string
          empresa_id: string
          estimated_time: string | null
          id: string
          route_date: string
          route_order: number
          status: string
          vehicle_id: string | null
        }
        Insert: {
          actual_time?: string | null
          booking_id: string
          created_at?: string
          driver_id: string
          empresa_id: string
          estimated_time?: string | null
          id?: string
          route_date: string
          route_order?: number
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_time?: string | null
          booking_id?: string
          created_at?: string
          driver_id?: string
          empresa_id?: string
          estimated_time?: string | null
          id?: string
          route_date?: string
          route_order?: number
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_route_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_route_items_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_route_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_route_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_types: {
        Row: {
          base_price: number
          color: string
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          name: string
          status: string
        }
        Insert: {
          base_price?: number
          color?: string
          created_at?: string
          description?: string | null
          empresa_id: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          base_price?: number
          color?: string
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_types_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string | null
          capacity: number
          color: string | null
          created_at: string
          driver_id: string | null
          empresa_id: string
          id: string
          model: string
          notes: string | null
          plate: string | null
          status: string
          updated_at: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id?: string | null
          empresa_id: string
          id?: string
          model: string
          notes?: string | null
          plate?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id?: string | null
          empresa_id?: string
          id?: string
          model?: string
          notes?: string | null
          plate?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      efetuar_baixa: {
        Args: {
          p_banco_id: string
          p_banco_nome: string
          p_conta_id: string
          p_data_baixa: string
          p_observacao?: string
          p_valor_desconto?: number
          p_valor_juros?: number
          p_valor_pago: number
        }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_operational_empresa_id: { Args: never; Returns: string }
      get_operational_user_id: { Args: never; Returns: string }
      get_user_cliente_id: { Args: never; Returns: string }
      get_user_empresa_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_not_deleted: { Args: { p_deleted_at: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      verify_operational_pin: {
        Args: { p_email: string; p_empresa_id: string; p_pin: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "atendente"
        | "financeiro"
        | "operacional"
        | "cliente"
        | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gerente",
        "atendente",
        "financeiro",
        "operacional",
        "cliente",
        "super_admin",
      ],
    },
  },
} as const
