module Reporter
  class WorkerDoiList < Worker
    def initialize(args)
      super(args)
    end

    def process
      @content_objs, @procedure_objs = prism(@objs)
      @tmpfile = Tempfile.new

      case @ext
      when 'xlsx'
        create_xlsx
      end

      create_attachment(@tmpfile) if @tmpfile
    end

    private

    def contents
      @objs
    end

    def create_xlsx
      @full_filename = "#{@file_name}.xlsx"
      @typ = XLSX_TYP
      Reporter::Xlsx::DoiList.new(
        objs: @content_objs,
        mol_serials: @mol_serials
      ).create(@tmpfile.path)
    end
  end
end
