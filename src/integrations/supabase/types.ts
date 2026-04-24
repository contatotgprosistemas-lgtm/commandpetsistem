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
          checkout_obs: string | null
          cliente_id: string
          created_at: string
          data_entrada: string | null
          data_hora: string
          data_saida: string | null
          data_saida_provavel: string | null
          desconto: number | null
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
          checkout_obs?: string | null
          cliente_id: string
          created_at?: string
          data_entrada?: string | null
          data_hora: string
          data_saida?: string | null
          data_saida_provavel?: string | null
          desconto?: number | null
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
          checkout_obs?: string | null
          cliente_id?: string
          created_at?: string
          data_entrada?: string | null
          data_hora?: string
          data_saida?: string | null
          data_saida_provavel?: string | null
          desconto?: number | null
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
      asaas_nfse_config: {
        Row: {
          aliquota_iss: number | null
          asaas_conta_id: string | null
          cnae: string | null
          codigo_servico_municipio: string | null
          created_at: string
          descricao_servico_padrao: string | null
          emitir_automaticamente: boolean | null
          empresa_id: string
          id: string
          iss_retido: boolean | null
          item_lista_servico: string | null
          municipio_codigo_ibge: string | null
          municipio_nome: string | null
          observacoes: string | null
          rps_proximo_numero: number | null
          rps_serie: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aliquota_iss?: number | null
          asaas_conta_id?: string | null
          cnae?: string | null
          codigo_servico_municipio?: string | null
          created_at?: string
          descricao_servico_padrao?: string | null
          emitir_automaticamente?: boolean | null
          empresa_id: string
          id?: string
          iss_retido?: boolean | null
          item_lista_servico?: string | null
          municipio_codigo_ibge?: string | null
          municipio_nome?: string | null
          observacoes?: string | null
          rps_proximo_numero?: number | null
          rps_serie?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aliquota_iss?: number | null
          asaas_conta_id?: string | null
          cnae?: string | null
          codigo_servico_municipio?: string | null
          created_at?: string
          descricao_servico_padrao?: string | null
          emitir_automaticamente?: boolean | null
          empresa_id?: string
          id?: string
          iss_retido?: boolean | null
          item_lista_servico?: string | null
          municipio_codigo_ibge?: string | null
          municipio_nome?: string | null
          observacoes?: string | null
          rps_proximo_numero?: number | null
          rps_serie?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_nfse_config_asaas_conta_id_fkey"
            columns: ["asaas_conta_id"]
            isOneToOne: false
            referencedRelation: "asaas_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_nfse_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_nfse_documents: {
        Row: {
          aliquota_iss: number | null
          asaas_nfse_id: string | null
          asaas_payment_id: string | null
          cliente_id: string | null
          codigo_verificacao: string | null
          conta_receber_id: string | null
          created_at: string
          created_by: string | null
          data_cancelamento: string | null
          data_emissao: string | null
          descricao: string | null
          empresa_id: string
          erro_mensagem: string | null
          id: string
          link_visualizacao: string | null
          motivo_cancelamento: string | null
          numero: string | null
          payload_envio: Json | null
          payload_resposta: Json | null
          pdf_url: string | null
          serie: string | null
          status: string
          tomador_cpf_cnpj: string | null
          tomador_email: string | null
          tomador_nome: string | null
          updated_at: string
          valor_iss: number | null
          valor_servico: number
          xml_url: string | null
        }
        Insert: {
          aliquota_iss?: number | null
          asaas_nfse_id?: string | null
          asaas_payment_id?: string | null
          cliente_id?: string | null
          codigo_verificacao?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          descricao?: string | null
          empresa_id: string
          erro_mensagem?: string | null
          id?: string
          link_visualizacao?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_resposta?: Json | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          tomador_cpf_cnpj?: string | null
          tomador_email?: string | null
          tomador_nome?: string | null
          updated_at?: string
          valor_iss?: number | null
          valor_servico?: number
          xml_url?: string | null
        }
        Update: {
          aliquota_iss?: number | null
          asaas_nfse_id?: string | null
          asaas_payment_id?: string | null
          cliente_id?: string | null
          codigo_verificacao?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          descricao?: string | null
          empresa_id?: string
          erro_mensagem?: string | null
          id?: string
          link_visualizacao?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_resposta?: Json | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          tomador_cpf_cnpj?: string | null
          tomador_email?: string | null
          tomador_nome?: string | null
          updated_at?: string
          valor_iss?: number | null
          valor_servico?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_nfse_documents_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_nfse_documents_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_nfse_documents_empresa_id_fkey"
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
      baias: {
        Row: {
          ativa: boolean
          capacidade_pets: number
          created_at: string
          empresa_id: string
          id: string
          nome: string
          tamanho: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          capacidade_pets?: number
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          tamanho?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          capacidade_pets?: number
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          tamanho?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "baias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_config: {
        Row: {
          created_at: string
          empresa_id: string
          enabled: boolean
          mensagem_cliente: string
          mensagem_pet: string
          send_to_cliente: boolean
          send_to_pet: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          enabled?: boolean
          mensagem_cliente?: string
          mensagem_pet?: string
          send_to_cliente?: boolean
          send_to_pet?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          enabled?: boolean
          mensagem_cliente?: string
          mensagem_pet?: string
          send_to_cliente?: boolean
          send_to_pet?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_log: {
        Row: {
          ano: number
          cliente_id: string | null
          empresa_id: string
          enviado_em: string
          id: string
          notificacao_id: string | null
          pet_id: string | null
          tipo: string
        }
        Insert: {
          ano: number
          cliente_id?: string | null
          empresa_id: string
          enviado_em?: string
          id?: string
          notificacao_id?: string | null
          pet_id?: string | null
          tipo: string
        }
        Update: {
          ano?: number
          cliente_id?: string | null
          empresa_id?: string
          enviado_em?: string
          id?: string
          notificacao_id?: string | null
          pet_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_log_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_log_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "customer_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
          dia_vencimento_fatura: number | null
          dias_gerar_fatura: number
          email: string | null
          empresa_id: string
          endereco: string | null
          foto_url: string | null
          id: string
          nome: string
          notas: string | null
          saldo_credito: number
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
          dia_vencimento_fatura?: number | null
          dias_gerar_fatura?: number
          email?: string | null
          empresa_id: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          notas?: string | null
          saldo_credito?: number
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
          dia_vencimento_fatura?: number | null
          dias_gerar_fatura?: number
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          notas?: string | null
          saldo_credito?: number
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
          cliente_id: string | null
          created_at: string
          crm_contato_id: string | null
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
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
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
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
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
          asaas_conta_id: string | null
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
          asaas_conta_id?: string | null
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
          asaas_conta_id?: string | null
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
            foreignKeyName: "contas_receber_asaas_conta_id_fkey"
            columns: ["asaas_conta_id"]
            isOneToOne: false
            referencedRelation: "asaas_contas"
            referencedColumns: ["id"]
          },
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
      contas_receber_itens: {
        Row: {
          conta_receber_id: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          conta_receber_id: string
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          tipo?: string
          valor?: number
        }
        Update: {
          conta_receber_id?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_itens_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
        ]
      }
      conversas: {
        Row: {
          atendente_id: string | null
          chatbot_enabled: boolean
          chatbot_flow_started_at: string | null
          cliente_id: string | null
          contato_nome: string
          contato_telefone: string
          created_at: string
          crm_contato_id: string | null
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
          chatbot_enabled?: boolean
          chatbot_flow_started_at?: string | null
          cliente_id?: string | null
          contato_nome: string
          contato_telefone: string
          created_at?: string
          crm_contato_id?: string | null
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
          chatbot_enabled?: boolean
          chatbot_flow_started_at?: string | null
          cliente_id?: string | null
          contato_nome?: string
          contato_telefone?: string
          created_at?: string
          crm_contato_id?: string | null
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
      crm_anotacoes_internas: {
        Row: {
          autor_id: string
          contato_id: string | null
          conteudo: string
          conversa_id: string | null
          created_at: string
          empresa_id: string
          id: string
        }
        Insert: {
          autor_id: string
          contato_id?: string | null
          conteudo: string
          conversa_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
        }
        Update: {
          autor_id?: string
          contato_id?: string | null
          conteudo?: string
          conversa_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_anotacoes_internas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_anotacoes_internas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "crm_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_atendentes_canal: {
        Row: {
          canal_id: string
          empresa_id: string
          user_id: string
        }
        Insert: {
          canal_id: string
          empresa_id: string
          user_id: string
        }
        Update: {
          canal_id?: string
          empresa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_atendentes_canal_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "crm_canais"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_atividades: {
        Row: {
          autor_id: string | null
          contato_id: string | null
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          lead_id: string | null
          metadata: Json | null
          tipo: string
        }
        Insert: {
          autor_id?: string | null
          contato_id?: string | null
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          tipo: string
        }
        Update: {
          autor_id?: string | null
          contato_id?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_atividades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campanha_destinatarios: {
        Row: {
          campanha_id: string
          contato_id: string | null
          created_at: string
          empresa_id: string
          enviado_em: string | null
          erro: string | null
          id: string
          nome: string | null
          numero: string
          status: string
        }
        Insert: {
          campanha_id: string
          contato_id?: string | null
          created_at?: string
          empresa_id: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          numero: string
          status?: string
        }
        Update: {
          campanha_id?: string
          contato_id?: string | null
          created_at?: string
          empresa_id?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          numero?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campanha_destinatarios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "crm_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campanhas: {
        Row: {
          agendado_para: string | null
          canal_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          intervalo_segundos: number
          mensagem: string
          midia_url: string | null
          nome: string
          status: string
          total_destinatarios: number
          total_enviados: number
          total_falhas: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          canal_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          intervalo_segundos?: number
          mensagem: string
          midia_url?: string | null
          nome: string
          status?: string
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          canal_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          intervalo_segundos?: number
          mensagem?: string
          midia_url?: string | null
          nome?: string
          status?: string
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_canais: {
        Row: {
          ativo: boolean
          config: Json
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          identificador: string | null
          menu_config: Json
          nome: string
          numero_telefone: string | null
          palavras_chave_config: Json
          provedor: Database["public"]["Enums"]["crm_canal_provedor"]
          roteamento: string
          roteamento_atendentes: string[] | null
          roteamento_modo: string
          roteamento_ultimo_idx: number
          setor: string | null
          setor_padrao_id: string | null
          status: Database["public"]["Enums"]["crm_canal_status"]
          tipo: Database["public"]["Enums"]["crm_canal_tipo"]
          ultima_conexao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          identificador?: string | null
          menu_config?: Json
          nome: string
          numero_telefone?: string | null
          palavras_chave_config?: Json
          provedor?: Database["public"]["Enums"]["crm_canal_provedor"]
          roteamento?: string
          roteamento_atendentes?: string[] | null
          roteamento_modo?: string
          roteamento_ultimo_idx?: number
          setor?: string | null
          setor_padrao_id?: string | null
          status?: Database["public"]["Enums"]["crm_canal_status"]
          tipo?: Database["public"]["Enums"]["crm_canal_tipo"]
          ultima_conexao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          identificador?: string | null
          menu_config?: Json
          nome?: string
          numero_telefone?: string | null
          palavras_chave_config?: Json
          provedor?: Database["public"]["Enums"]["crm_canal_provedor"]
          roteamento?: string
          roteamento_atendentes?: string[] | null
          roteamento_modo?: string
          roteamento_ultimo_idx?: number
          setor?: string | null
          setor_padrao_id?: string | null
          status?: Database["public"]["Enums"]["crm_canal_status"]
          tipo?: Database["public"]["Enums"]["crm_canal_tipo"]
          ultima_conexao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_canais_setor_padrao_id_fkey"
            columns: ["setor_padrao_id"]
            isOneToOne: false
            referencedRelation: "crm_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contato_tag_links: {
        Row: {
          contato_id: string
          empresa_id: string
          tag_id: string
        }
        Insert: {
          contato_id: string
          empresa_id: string
          tag_id: string
        }
        Update: {
          contato_id?: string
          empresa_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contato_tag_links_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contato_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_contato_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contato_tags: {
        Row: {
          cor: string
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      crm_contatos: {
        Row: {
          avatar_url: string | null
          cidade: string | null
          created_at: string
          documento: string | null
          email: string | null
          empresa: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          id: string
          metadata: Json
          nome: string
          observacoes: string | null
          origem: string | null
          responsavel_id: string | null
          score: number
          telefone: string | null
          ultima_interacao: string | null
          updated_at: string
          valor_potencial: number | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          id?: string
          metadata?: Json
          nome: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          score?: number
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          valor_potencial?: number | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          metadata?: Json
          nome?: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          score?: number
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          valor_potencial?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_conversas: {
        Row: {
          aguardando_setor: boolean
          arquivada: boolean
          assumida_em: string | null
          atendente_id: string | null
          aviso_ausencia_em: string | null
          canal_id: string
          contato_id: string
          created_at: string
          empresa_id: string
          fixada: boolean
          id: string
          identificador_externo: string | null
          intencao: string | null
          nao_lidas: number
          primeira_resposta_em: string | null
          prioridade: Database["public"]["Enums"]["crm_conversa_prioridade"]
          resumo_ia: string | null
          sentimento: string | null
          setor_id: string | null
          status: Database["public"]["Enums"]["crm_conversa_status"]
          tempo_primeira_resposta_seg: number | null
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
          updated_at: string
        }
        Insert: {
          aguardando_setor?: boolean
          arquivada?: boolean
          assumida_em?: string | null
          atendente_id?: string | null
          aviso_ausencia_em?: string | null
          canal_id: string
          contato_id: string
          created_at?: string
          empresa_id: string
          fixada?: boolean
          id?: string
          identificador_externo?: string | null
          intencao?: string | null
          nao_lidas?: number
          primeira_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["crm_conversa_prioridade"]
          resumo_ia?: string | null
          sentimento?: string | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["crm_conversa_status"]
          tempo_primeira_resposta_seg?: number | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          updated_at?: string
        }
        Update: {
          aguardando_setor?: boolean
          arquivada?: boolean
          assumida_em?: string | null
          atendente_id?: string | null
          aviso_ausencia_em?: string | null
          canal_id?: string
          contato_id?: string
          created_at?: string
          empresa_id?: string
          fixada?: boolean
          id?: string
          identificador_externo?: string | null
          intencao?: string | null
          nao_lidas?: number
          primeira_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["crm_conversa_prioridade"]
          resumo_ia?: string | null
          sentimento?: string | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["crm_conversa_status"]
          tempo_primeira_resposta_seg?: number | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_conversas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "crm_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_conversas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "crm_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_executions: {
        Row: {
          contato_id: string | null
          conversa_id: string | null
          created_at: string
          empresa_id: string
          erro: string | null
          flow_id: string
          id: string
          payload: Json | null
          status: string
        }
        Insert: {
          contato_id?: string | null
          conversa_id?: string | null
          created_at?: string
          empresa_id: string
          erro?: string | null
          flow_id: string
          id?: string
          payload?: Json | null
          status?: string
        }
        Update: {
          contato_id?: string | null
          conversa_id?: string | null
          created_at?: string
          empresa_id?: string
          erro?: string | null
          flow_id?: string
          id?: string
          payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flows: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          definicao: Json
          descricao: string | null
          empresa_id: string
          gatilho: string
          gatilho_config: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          definicao?: Json
          descricao?: string | null
          empresa_id: string
          gatilho?: string
          gatilho_config?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          definicao?: Json
          descricao?: string | null
          empresa_id?: string
          gatilho?: string
          gatilho_config?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_horario_comercial: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          enviar_apenas_uma_vez: boolean
          feriados: Json
          fuso: string
          horarios: Json
          id: string
          mensagem_fora_expediente: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          enviar_apenas_uma_vez?: boolean
          feriados?: Json
          fuso?: string
          horarios?: Json
          id?: string
          mensagem_fora_expediente?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          enviar_apenas_uma_vez?: boolean
          feriados?: Json
          fuso?: string
          horarios?: Json
          id?: string
          mensagem_fora_expediente?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          contato_id: string
          created_at: string
          data_fechamento: string | null
          data_previsao_fechamento: string | null
          descricao: string | null
          empresa_id: string
          etapa_id: string
          id: string
          motivo_perda: string | null
          ordem: number
          origem: string | null
          pipeline_id: string
          probabilidade: number | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          contato_id: string
          created_at?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          descricao?: string | null
          empresa_id: string
          etapa_id: string
          id?: string
          motivo_perda?: string | null
          ordem?: number
          origem?: string | null
          pipeline_id: string
          probabilidade?: number | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          titulo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          contato_id?: string
          created_at?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          descricao?: string | null
          empresa_id?: string
          etapa_id?: string
          id?: string
          motivo_perda?: string | null
          ordem?: number
          origem?: string | null
          pipeline_id?: string
          probabilidade?: number | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_mensagens: {
        Row: {
          conteudo: string | null
          conversa_id: string
          created_at: string
          direcao: Database["public"]["Enums"]["crm_mensagem_direcao"]
          empresa_id: string
          entregue_em: string | null
          enviada_em: string | null
          id: string
          identificador_externo: string | null
          lida_em: string | null
          metadata: Json
          midia_filename: string | null
          midia_mimetype: string | null
          midia_tamanho: number | null
          midia_url: string | null
          reacao: string | null
          remetente_id: string | null
          remetente_nome: string | null
          reply_to_id: string | null
          status: Database["public"]["Enums"]["crm_mensagem_status"]
          tipo: Database["public"]["Enums"]["crm_mensagem_tipo"]
        }
        Insert: {
          conteudo?: string | null
          conversa_id: string
          created_at?: string
          direcao: Database["public"]["Enums"]["crm_mensagem_direcao"]
          empresa_id: string
          entregue_em?: string | null
          enviada_em?: string | null
          id?: string
          identificador_externo?: string | null
          lida_em?: string | null
          metadata?: Json
          midia_filename?: string | null
          midia_mimetype?: string | null
          midia_tamanho?: number | null
          midia_url?: string | null
          reacao?: string | null
          remetente_id?: string | null
          remetente_nome?: string | null
          reply_to_id?: string | null
          status?: Database["public"]["Enums"]["crm_mensagem_status"]
          tipo?: Database["public"]["Enums"]["crm_mensagem_tipo"]
        }
        Update: {
          conteudo?: string | null
          conversa_id?: string
          created_at?: string
          direcao?: Database["public"]["Enums"]["crm_mensagem_direcao"]
          empresa_id?: string
          entregue_em?: string | null
          enviada_em?: string | null
          id?: string
          identificador_externo?: string | null
          lida_em?: string | null
          metadata?: Json
          midia_filename?: string | null
          midia_mimetype?: string | null
          midia_tamanho?: number | null
          midia_url?: string | null
          reacao?: string | null
          remetente_id?: string | null
          remetente_nome?: string | null
          reply_to_id?: string | null
          status?: Database["public"]["Enums"]["crm_mensagem_status"]
          tipo?: Database["public"]["Enums"]["crm_mensagem_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "crm_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_mensagens_agendadas: {
        Row: {
          agendada_para: string
          conteudo: string
          conversa_id: string
          created_at: string
          created_by: string | null
          empresa_id: string
          enviada_em: string | null
          erro: string | null
          id: string
          status: string
        }
        Insert: {
          agendada_para: string
          conteudo: string
          conversa_id: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          status?: string
        }
        Update: {
          agendada_para?: string
          conteudo?: string
          conversa_id?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_mensagens_agendadas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "crm_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notas_conversa: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          conteudo: string
          conversa_id: string
          created_at: string
          empresa_id: string
          id: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          conteudo: string
          conversa_id: string
          created_at?: string
          empresa_id: string
          id?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          conteudo?: string
          conversa_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notas_conversa_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "crm_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_etapas: {
        Row: {
          cor: string
          created_at: string
          empresa_id: string
          id: string
          is_ganho: boolean
          is_perdido: boolean
          nome: string
          ordem: number
          pipeline_id: string
          probabilidade: number
          sla_horas: number | null
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          empresa_id: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome: string
          ordem?: number
          pipeline_id: string
          probabilidade?: number
          sla_horas?: number | null
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          empresa_id?: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome?: string
          ordem?: number
          pipeline_id?: string
          probabilidade?: number
          sla_horas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_etapas_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          is_padrao: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          is_padrao?: boolean
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          is_padrao?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_respostas_rapidas: {
        Row: {
          atalho: string
          ativo: boolean
          categoria: string | null
          conteudo: string
          created_at: string
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          atalho: string
          ativo?: boolean
          categoria?: string | null
          conteudo: string
          created_at?: string
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          atalho?: string
          ativo?: boolean
          categoria?: string | null
          conteudo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_setor_atendentes: {
        Row: {
          empresa_id: string
          setor_id: string
          user_id: string
        }
        Insert: {
          empresa_id: string
          setor_id: string
          user_id: string
        }
        Update: {
          empresa_id?: string
          setor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_setor_atendentes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "crm_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_setores: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_tarefas: {
        Row: {
          concluida_em: string | null
          contato_id: string | null
          conversa_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          id: string
          lead_id: string | null
          prazo: string | null
          prioridade: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["crm_tarefa_status"]
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida_em?: string | null
          contato_id?: string | null
          conversa_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          lead_id?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["crm_tarefa_status"]
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida_em?: string | null
          contato_id?: string | null
          conversa_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          lead_id?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["crm_tarefa_status"]
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tarefas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tarefas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "crm_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_templates: {
        Row: {
          atalho: string | null
          categoria: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          atalho?: string | null
          categoria?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          atalho?: string | null
          categoria?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
          esteira_banho_ativa: boolean
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
          esteira_banho_ativa?: boolean
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
          esteira_banho_ativa?: boolean
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
      esteira_banho: {
        Row: {
          agendamento_id: string
          banhista_nome: string | null
          created_at: string
          duracao_segundos: number | null
          empresa_id: string
          fim_at: string | null
          id: string
          inicio_at: string | null
          status: string
        }
        Insert: {
          agendamento_id: string
          banhista_nome?: string | null
          created_at?: string
          duracao_segundos?: number | null
          empresa_id: string
          fim_at?: string | null
          id?: string
          inicio_at?: string | null
          status?: string
        }
        Update: {
          agendamento_id?: string
          banhista_nome?: string | null
          created_at?: string
          duracao_segundos?: number | null
          empresa_id?: string
          fim_at?: string | null
          id?: string
          inicio_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "esteira_banho_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esteira_banho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      formas_pagamento: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          crm_contato_id: string | null
          empresa_id: string
          estagio: string
          id: string
          notas: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
          empresa_id: string
          estagio?: string
          id?: string
          notas?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
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
          cliente_id: string | null
          created_at: string
          crm_contato_id: string | null
          descricao: string
          empresa_id: string
          id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
          descricao: string
          empresa_id: string
          id?: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          crm_contato_id?: string | null
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
          conta_bancaria_id: string | null
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
          conta_bancaria_id?: string | null
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
          conta_bancaria_id?: string | null
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
            foreignKeyName: "movimentacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
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
      movimentacoes_estoque: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          motivo: string | null
          produto_id: string
          quantidade: number
          tipo: string
          venda_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          motivo?: string | null
          produto_id: string
          quantidade: number
          tipo?: string
          venda_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_contato: {
        Row: {
          autor_id: string | null
          cliente_id: string | null
          conteudo: string
          created_at: string
          crm_contato_id: string | null
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          cliente_id?: string | null
          conteudo: string
          created_at?: string
          crm_contato_id?: string | null
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          crm_contato_id?: string | null
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
          codigo_barras: string | null
          created_at: string
          custo: number
          descricao: string
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          ncm: string | null
          tipo: string
          unidade: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo_barras?: string | null
          created_at?: string
          custo?: number
          descricao: string
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          ncm?: string | null
          tipo?: string
          unidade?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          codigo_barras?: string | null
          created_at?: string
          custo?: number
          descricao?: string
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          ncm?: string | null
          tipo?: string
          unidade?: string
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
          acesso_operacional: boolean
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
          acesso_operacional?: boolean
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
          acesso_operacional?: boolean
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
      short_links: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          origin: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          origin: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          origin?: string
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_links_empresa_id_fkey"
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
      vendas_produtos: {
        Row: {
          cliente_id: string | null
          created_at: string
          cupom_fiscal: string | null
          data_venda: string
          desconto: number
          empresa_id: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_final: number
          valor_total: number
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          cupom_fiscal?: string | null
          data_venda?: string
          desconto?: number
          empresa_id: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_final?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          cupom_fiscal?: string | null
          data_venda?: string
          desconto?: number
          empresa_id?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_final?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produtos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_produtos_itens: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          produto_id: string | null
          quantidade: number
          servico_id: string | null
          subtotal: number
          valor_unitario: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          subtotal: number
          valor_unitario: number
          venda_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          subtotal?: number
          valor_unitario?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_produtos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produtos_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produtos_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_crm_conversa: {
        Args: { _conversa_id: string }
        Returns: boolean
      }
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
          p_forma_pagamento?: string
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
      excluir_movimentacao: {
        Args: { p_movimentacao_id: string }
        Returns: Json
      }
      get_empresa_logo: { Args: { p_empresa_id: string }; Returns: string }
      get_operational_empresa_id: { Args: never; Returns: string }
      get_operational_user_id: { Args: never; Returns: string }
      get_own_cargo: { Args: never; Returns: string }
      get_user_cliente_id: { Args: never; Returns: string }
      get_user_empresa_id: { Args: never; Returns: string }
      get_user_setor_ids: { Args: never; Returns: string[] }
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
      sincronizar_saldo_bancario: {
        Args: { p_conta_bancaria_id: string }
        Returns: number
      }
      sincronizar_todos_saldos: {
        Args: { p_empresa_id: string }
        Returns: Json
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
      crm_canal_provedor:
        | "evolution"
        | "cloud_api"
        | "baileys"
        | "wppconnect"
        | "meta"
        | "manual"
      crm_canal_status: "desconectado" | "conectando" | "conectado" | "erro"
      crm_canal_tipo:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "email"
        | "webchat"
        | "sms"
      crm_conversa_prioridade: "baixa" | "normal" | "alta" | "urgente"
      crm_conversa_status:
        | "aberta"
        | "pendente"
        | "em_atendimento"
        | "finalizada"
      crm_lead_status: "aberto" | "ganho" | "perdido"
      crm_mensagem_direcao: "entrada" | "saida"
      crm_mensagem_status:
        | "pendente"
        | "enviado"
        | "entregue"
        | "lido"
        | "falhou"
      crm_mensagem_tipo:
        | "texto"
        | "imagem"
        | "audio"
        | "video"
        | "documento"
        | "localizacao"
        | "contato"
        | "sistema"
      crm_tarefa_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
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
      crm_canal_provedor: [
        "evolution",
        "cloud_api",
        "baileys",
        "wppconnect",
        "meta",
        "manual",
      ],
      crm_canal_status: ["desconectado", "conectando", "conectado", "erro"],
      crm_canal_tipo: [
        "whatsapp",
        "instagram",
        "facebook",
        "email",
        "webchat",
        "sms",
      ],
      crm_conversa_prioridade: ["baixa", "normal", "alta", "urgente"],
      crm_conversa_status: [
        "aberta",
        "pendente",
        "em_atendimento",
        "finalizada",
      ],
      crm_lead_status: ["aberto", "ganho", "perdido"],
      crm_mensagem_direcao: ["entrada", "saida"],
      crm_mensagem_status: [
        "pendente",
        "enviado",
        "entregue",
        "lido",
        "falhou",
      ],
      crm_mensagem_tipo: [
        "texto",
        "imagem",
        "audio",
        "video",
        "documento",
        "localizacao",
        "contato",
        "sistema",
      ],
      crm_tarefa_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
