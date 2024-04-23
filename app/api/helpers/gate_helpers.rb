module GateHelpers
  extend Grape::API::Helpers

  def prepare_for_receiving(request)
    http_token = (request.headers['Authorization'].split(' ').last if request.headers['Authorization'].present?) # rubocop: disable Style/RedundantArgument
    error!('Unauthorized', 401) unless http_token
    secret = Rails.application.secrets.secret_key_base
    begin
      @auth_token = ActiveSupport::HashWithIndifferentAccess.new(
        JWT.decode(http_token, secret)[0],
      )
    rescue JWT::VerificationError, JWT::DecodeError, JWT::ExpiredSignature => e
      log_exception('prepare_for_receiving-JWT::Error', e)
      error!("#{e}", 401)
    end
    @user = Person.find_by(email: @auth_token[:iss])
    error!('Unauthorized', 401) unless @user
    @collection = Collection.find_by(
      id: @auth_token[:collection], user_id: @user.id, is_shared: false,
    )
    error!('Unauthorized access to collection', 401) unless @collection
    @origin = @auth_token["origin"]
    [@user, @collection, @origin]
  rescue StandardError => e
    log_exception('prepare_for_receiving', e, @user&.id)
    raise e
  end

  def save_chunk(user_id, col_id, params)
    FileUtils.mkdir_p(Rails.root.join('tmp/uploads', 'chunks'))
    filename = Rails.root.join('tmp', 'uploads', 'chunks', "#{user_id}_#{@collection.id}_#{params[:uuid]}")
    tempfile = params[:chunk]&.fetch('tempfile', nil)
    if tempfile
      File.open(filename, 'ab') { |file| file.write(tempfile.read) }
    end  
    filename
  rescue StandardError => e
    log_exception('save_chunk', e, user_id)
    raise e
  ensure
    tempfile&.close
    tempfile&.unlink
  end

  
  def log_exception(func_name, exception, user_id = nil)
    transfer_logger.error("[#{DateTime.now}] [#{func_name}] user: [#{user_id}] \n Exception: #{exception.message}")   
    transfer_logger.error(exception.backtrace.join("\n"))
  end

  def transfer_logger
    @@transfer_logger ||= Logger.new(File.join(Rails.root, 'log', 'transfering.log'))
  end
end

