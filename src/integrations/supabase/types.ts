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
          como_conheceu: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
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
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
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
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
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
          status: string
          ultima_mensagem_at: string | null
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
          status?: string
          ultima_mensagem_at?: string | null
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
          status?: string
          ultima_mensagem_at?: string | null
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
          created_at: string
          discount_amount: number | null
          empresa_id: string
          end_date: string | null
          final_price: number
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
          created_at?: string
          discount_amount?: number | null
          empresa_id: string
          end_date?: string | null
          final_price?: number
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
          created_at?: string
          discount_amount?: number | null
          empresa_id?: string
          end_date?: string | null
          final_price?: number
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
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          nome_empresa: string
          plano: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome_empresa: string
          plano?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome_empresa?: string
          plano?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          cliente_id: string
          comportamento: string | null
          created_at: string
          data_nascimento: string | null
          empresa_id: string
          especie: string
          id: string
          idade: string | null
          medicacoes: string | null
          nome: string
          pelagem: string | null
          peso: number | null
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
          cliente_id: string
          comportamento?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id: string
          especie?: string
          id?: string
          idade?: string | null
          medicacoes?: string | null
          nome: string
          pelagem?: string | null
          peso?: number | null
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
          cliente_id?: string
          comportamento?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id?: string
          especie?: string
          id?: string
          idade?: string | null
          medicacoes?: string | null
          nome?: string
          pelagem?: string | null
          peso?: number | null
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
          auto_renew: boolean | null
          cancellation_fee: number | null
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
          auto_renew?: boolean | null
          cancellation_fee?: number | null
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
          auto_renew?: boolean | null
          cancellation_fee?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_user_cliente_id: { Args: never; Returns: string }
      get_user_empresa_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      ],
    },
  },
} as const
