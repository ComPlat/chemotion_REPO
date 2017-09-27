module Reporter
  module Xlsx
    class DoiList
      IMG_HEIGHT = 68
      IMG_WIDTH = 300
      TEXT_SIZE = 14
      ROW_PRD_BEGIN = 3
      IMG_BEGIN_X = 2
      IMG_BEGIN_Y = 1
      ROW_HEIGHT = 60
      HEADERS = [
        'Label', 'Type', 'Image', 'DOI', 'URL'
      ].freeze

      def initialize(args)
        @objs = args[:objs]
        @mol_serials = args[:mol_serials] || []
      end

      def create(file_name)
        xfile = Axlsx::Package.new
        file_extension = 'xlsx'
        xfile.workbook.styles.fonts.first.name = 'Calibri'
        @sheet = xfile.workbook.add_worksheet(name: 'Repository Report DOI List')
        @style_header = @sheet.styles.add_style(sz: 16, :border => { :style => :thick, :color => "FF777777" })
        @style_data = @sheet.styles.add_style(sz: 14, :alignment=>{:vertical => :center}, :border => { :style => :thin, :color => "FF777777" })
        @style_first = @sheet.styles.add_style(sz: 14, :alignment=>{:vertical => :center}, :border => { :style => :thick, :color => "FF777777", :edges => [:top] })
        @sheet.add_row(HEADERS, style: @style_header)

        row_content

        @sheet.column_widths 15, 10, 50, 80, 120
        xfile.serialize(file_name)

      end

      private

      def row_counts
        @objs.length + ROW_PRD_BEGIN
      end

      #
      # def row_sub_title
      #   @sheet.add_row [
      #
      #   ], sz: TEXT_SIZE, height: 20, b: true
      # end

      def add_content_to_row(p, lv)
        return if p.nil?
        if p.element_type == 'Sample'
          serial = Reporter::Helper.mol_serial(p.element&.molecule_id, @mol_serials)
        end
        @sheet.add_row([
          serial,
          p.element_type == 'Container' ? 'Analysis' : p.element_type,
          '',
          p.doi.full_doi,
          'https://dx.doi.org/' + p.doi.full_doi,
        ], height: p.element_type == 'Container' ? 20 : ROW_HEIGHT, style: lv == 1 ? @style_first : @style_data)
        add_img_to_row(p)
        @counter += 1
      end

      def create_file(png_blob)
        file = Tempfile.new(['image', '.png'])
        file.binmode
        file.write(png_blob)
        file.flush
        # file.close
        file
      end

      def get_image_from_svg(svg_path)
        image = Magick::Image.read(svg_path) { self.format = 'SVG'; }.first
        # image = image.resize_to_fit(200, 168)
        image.format = 'png'
        file = create_file(image.to_blob)
        { path: file.path, width: image.columns, height: image.rows }
      end

      def add_img_to_row(p)
        svg_path ='public/images/reactions/' + p.element&.reaction_svg_file if p.element_type == 'Reaction'
        svg_path ='public/images/samples/' + p.element&.sample_svg_file if p.element_type == 'Sample'

        image_data = get_image_from_svg(svg_path) unless svg_path.nil?
        img_src = image_data[:path] unless image_data.nil?

        return if img_src.nil?
        @sheet.add_image(image_src: img_src) do |img|
          img.height = IMG_HEIGHT.to_i
          img.width = image_data[:width] * IMG_HEIGHT.to_i / image_data[:height]
          img.start_at IMG_BEGIN_X, (IMG_BEGIN_Y + @counter)
        end
      end

      def row_content
        @counter = 0
        @objs.each do |obj|
          publication = Publication.find_by(element_id: obj[:id], element_type: obj[:type].capitalize)
          next if publication.nil?
          add_content_to_row(publication,1)

          publication&.children&.each do |a|
            next if a&.element_type == 'Sample'
            add_content_to_row(a, 2)
          end

          publication&.children&.each do |s|
            next if s&.element_type == 'Container'
            add_content_to_row(s, 2)
            s.children&.each do |a|
              add_content_to_row(a, 3)
            end
          end
        end
      end
    end
  end
end
